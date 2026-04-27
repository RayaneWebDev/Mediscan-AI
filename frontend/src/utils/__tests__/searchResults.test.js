/**
 * @fileoverview Search result utility tests for filtering and exports.
 *
 * This suite covers pure result utilities and browser export side effects:
 * score conversion, CUI normalization, caption suggestions, filter combinations,
 * JSON/CSV downloads, and PDF generation edge cases.
 * @module utils/tests/searchResultsTest
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CURATED_CAPTION_FILTERS,
  exportResultsAsCsv,
  exportResultsAsJson,
  exportResultsAsPdf,
  filterResultsPayload,
  getResultCuiSet,
  getSuggestedCaptionFilters,
  similarityScoreToPercent,
} from "../searchResults";

const saveMock = vi.fn();
const addImageMock = vi.fn();
const addPageMock = vi.fn();
const textMock = vi.fn();

vi.mock("jspdf", () => ({
  default: vi.fn(function MockJsPDF() {
    return {
      setFontSize: vi.fn(),
      text: textMock,
      splitTextToSize: vi.fn((text) => [text]),
      addImage: addImageMock,
      addPage: addPageMock,
      save: saveMock,
    };
  }),
}));

function samplePayload() {
  return {
    mode: "visual",
    results: [
      {
        rank: 1,
        image_id: "img-1",
        caption: "Chest x-ray with lung opacity",
        cui: JSON.stringify(["C1306645", "C0817096", "C1996865"]),
        path: "/img-1.png",
        score: 0.9,
      },
      {
        rank: 2,
        image_id: "img-2",
        caption: "Brain MRI study",
        cui: ["C0024485"],
        path: "/img-2.png",
        score: 0.4,
      },
      {
        rank: 3,
        image_id: "ref-3",
        caption: "Plain abdomen image",
        cui: "",
        path: "/img-3.png",
        score: -0.2,
      },
    ],
  };
}

describe("search result utilities", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
    HTMLAnchorElement.prototype.click = vi.fn();
  });

  it("converts similarity scores to bounded percentages", () => {
    expect(similarityScoreToPercent(1)).toBe(100);
    expect(similarityScoreToPercent(-1)).toBe(0);
    expect(similarityScoreToPercent(0)).toBe(50);
    expect(similarityScoreToPercent(2)).toBe(100);
    expect(similarityScoreToPercent(Number.NaN)).toBe(50);
  });

  it("extracts CUI sets from arrays, JSON strings, raw strings and blanks", () => {
    expect([...getResultCuiSet({ cui: [" c1 ", null, "c2"] })]).toEqual(["C1", "C2"]);
    expect([...getResultCuiSet({ cui: '["c3","c4"]' })]).toEqual(["C3", "C4"]);
    expect([...getResultCuiSet({ cui: " c5 " })]).toEqual(["C5"]);
    expect([...getResultCuiSet({ cui: "" })]).toEqual([]);
    expect([...getResultCuiSet(null)]).toEqual([]);
  });

  it("suggests caption filters by frequency", () => {
    const suggestions = getSuggestedCaptionFilters(samplePayload().results, 3);

    expect(suggestions.map((entry) => entry.id)).toEqual(["abdomen", "brain", "chest"]);
    expect(getSuggestedCaptionFilters([], 3)).toEqual([]);
    expect(CURATED_CAPTION_FILTERS.length).toBeGreaterThan(10);
  });

  it("filters and sorts result payloads", () => {
    const filtered = filterResultsPayload(samplePayload(), {
      minScore: 0.5,
      captionFilter: "opacity",
      cuiPresence: "with",
      cuiFilter: "c199",
      cuiModalite: "C1306645",
      cuiAnatomie: "C0817096",
      cuiFinding: "C1996865",
      referenceFilter: "img",
      captionTermGroups: [["x ray", "x-ray"], "lung"],
      sortOrder: "asc",
    });

    expect(filtered.results).toHaveLength(1);
    expect(filtered.results[0].image_id).toBe("img-1");
    expect(filterResultsPayload(null)).toBeNull();
    expect(filterResultsPayload(samplePayload(), { captionTermGroups: [[]] }).results).toHaveLength(2);
    expect(filterResultsPayload(samplePayload(), { captionTermGroups: [[""]] }).results).toHaveLength(2);
    expect(() => filterResultsPayload({ results: [null] }, { cuiFilter: "C1" })).toThrow();
  });

  it("supports CUI presence and descending score filters", () => {
    const withCui = filterResultsPayload(samplePayload(), { cuiPresence: "with" });
    const withoutCui = filterResultsPayload(samplePayload(), { minScore: -1, cuiPresence: "without" });
    const descending = filterResultsPayload(samplePayload(), { sortOrder: "desc" });

    expect(withCui.results.map((row) => row.image_id)).toEqual(["img-1", "img-2"]);
    expect(withoutCui.results.map((row) => row.image_id)).toEqual(["ref-3"]);
    expect(descending.results.map((row) => row.image_id)).toEqual(["img-1", "img-2"]);
  });

  it("exports JSON and CSV through temporary blob links", () => {
    exportResultsAsJson(samplePayload(), "results.json");
    exportResultsAsCsv(samplePayload(), "results.csv");
    exportResultsAsJson(null, "none.json");
    exportResultsAsCsv({ results: [] }, "none.csv");

    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(2);
  });

  it("exports PDF rows and tolerates image loading failures", async () => {
    fetch
      .mockResolvedValueOnce({
        blob: vi.fn().mockResolvedValue(new Blob(["png"], { type: "image/png" })),
      })
      .mockRejectedValueOnce(new Error("image missing"));

    await exportResultsAsPdf(
      {
        results: [
          { image_id: "img-1", caption: "Caption", score: 0.9, path: "/img-1.png" },
          { image_id: "img-2", caption: "", score: 0.8, path: "/img-2.png" },
        ],
      },
      "results.pdf",
      { title: "My title" },
    );
    await exportResultsAsPdf([], "empty.pdf");

    expect(saveMock).toHaveBeenCalledWith("results.pdf");
    expect(textMock).toHaveBeenCalled();
  });

  it("adds PDF pages for long result exports", async () => {
    fetch.mockResolvedValue({
      blob: vi.fn().mockResolvedValue(new Blob(["jpg"], { type: "image/jpeg" })),
    });

    await exportResultsAsPdf(
      {
        results: Array.from({ length: 4 }, (_, index) => ({
          image_id: `img-${index}`,
          caption: "Long export row",
          score: 0.7,
          path: `/img-${index}.jpg`,
        })),
      },
      "many.pdf",
    );

    expect(addPageMock).toHaveBeenCalled();
  });
});
