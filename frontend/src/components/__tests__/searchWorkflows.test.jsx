/**
 * @fileoverview Search workflow tests for image and text search screens.
 *
 * These tests exercise the complete user-facing search flows: text queries,
 * image uploads, relaunch from results, multi-selection centroid search, guarded
 * mode switching, auto-scroll behavior, pagination, exports, and SearchPage
 * view routing.
 * @module components/tests/searchWorkflowsTest
 */

import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ImageSearchView from "../ImageSearchView";
import ResultsGrid from "../ResultsGrid";
import SearchPage from "../SearchPage";
import TextSearchView from "../TextSearchView";
import { searchByIds, searchImage, searchText } from "../../api";
import { fr } from "../../i18n/fr";
import { renderWithProviders } from "../../test/renderWithProviders";

vi.mock("../../api", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchText: vi.fn(),
    searchImage: vi.fn(),
    searchById: vi.fn(),
    searchByIds: vi.fn(),
  };
});

const resultRows = Array.from({ length: 8 }, (_, index) => ({
  rank: index + 1,
  image_id: `img-${index + 1}`,
  caption: index === 0 ? "Chest x-ray with lung opacity" : `Medical image ${index + 1}`,
  cui: index === 0 ? JSON.stringify(["C1306645", "C0817096", "C1996865"]) : "",
  path: `/img-${index + 1}.png`,
  score: 0.95 - index * 0.05,
}));

const visualPayload = {
  mode: "visual",
  embedder: "fake",
  query_image: "/query.png",
  results: resultRows,
};

const semanticPayload = {
  mode: "semantic",
  embedder: "fake",
  query_image: "/query.png",
  results: resultRows.slice(0, 5),
};

async function flushFakeTimers(ms) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
  });
}

function mockReducedMotion(matches = true) {
  const originalMatchMedia = window.matchMedia;
  window.matchMedia = vi.fn((query) => ({
    matches: matches && query.includes("prefers-reduced-motion"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  return () => {
    window.matchMedia = originalMatchMedia;
  };
}

describe("search workflow components", () => {
  it("runs a text search and exposes filters/results", async () => {
    searchText
      .mockRejectedValueOnce(new Error("Text boom"))
      .mockResolvedValueOnce({ ...semanticPayload, mode: "text" });
    const onBack = vi.fn();
    const onChromeToneChange = vi.fn();

    renderWithProviders(<TextSearchView onBack={onBack} onChromeToneChange={onChromeToneChange} />);

    expect(onChromeToneChange).toHaveBeenCalledWith("accent");
    fireEvent.click(screen.getByRole("button", { name: fr.search.search }));
    expect(searchText).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText(fr.search.text.placeholder), {
      target: { value: "lung opacity" },
    });
    fireEvent.click(screen.getByRole("button", { name: fr.search.search }));

    await waitFor(() => expect(screen.getByText("Text boom")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: fr.search.search }));

    await waitFor(() => expect(searchText).toHaveBeenCalledWith("lung opacity", 5));
    expect(await screen.findByText(fr.search.filters.title)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(fr.search.filters.captionPlaceholder), {
      target: { value: "lung" },
    });
    fireEvent.click(screen.getByText(fr.search.filters.sortAsc));
    fireEvent.click(screen.getByText(fr.search.filters.reset));
    fireEvent.click(screen.getByLabelText(fr.search.text.modeInfoLabel));
    fireEvent.click(screen.getByLabelText(fr.search.filters.infoLabel));
    fireEvent.click(screen.getByText(fr.search.text.back));

    expect(onBack).toHaveBeenCalled();
  });

  it("auto-scrolls text results for reduced-motion users", async () => {
    vi.useFakeTimers();
    const restoreMatchMedia = mockReducedMotion(true);
    searchText.mockResolvedValueOnce({ ...semanticPayload, mode: "text" });

    renderWithProviders(<TextSearchView onBack={vi.fn()} onChromeToneChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(fr.search.text.placeholder), {
      target: { value: "lung opacity" },
    });
    fireEvent.click(screen.getByRole("button", { name: fr.search.search }));

    await flushFakeTimers(700);
    await flushFakeTimers(0);
    await flushFakeTimers(0);
    await flushFakeTimers(100);

    expect(screen.getByText(fr.search.filters.title)).toBeInTheDocument();
    restoreMatchMedia();
  });

  it("runs image searches, mode switches and selection relaunches", async () => {
    searchImage
      .mockRejectedValueOnce(new Error("Image boom"))
      .mockResolvedValueOnce(visualPayload);
    searchByIds.mockResolvedValueOnce(visualPayload);
    const file = new File(["scan"], "scan.png", { type: "image/png" });
    const onBack = vi.fn();
    const onChromeToneChange = vi.fn();

    renderWithProviders(<ImageSearchView onBack={onBack} onChromeToneChange={onChromeToneChange} />);

    fireEvent.click(screen.getByRole("button", { name: fr.search.search }));
    expect(searchImage).not.toHaveBeenCalled();

    fireEvent.change(document.querySelector("input[type='file']"), {
      target: { files: [new File(["bad"], "scan.gif", { type: "image/gif" })] },
    });
    expect(screen.getByText(fr.search.image.invalidFileType)).toBeInTheDocument();

    fireEvent.change(document.querySelector("input[type='file']"), {
      target: { files: [file] },
    });
    fireEvent.click(document.querySelector(".search-upload-remove"));
    fireEvent.change(document.querySelector("input[type='file']"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: fr.search.search }));

    await waitFor(() => expect(screen.getByText("Image boom")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: fr.search.search }));

    await waitFor(() => expect(searchImage).toHaveBeenCalledWith(file, "visual", 5));
    expect(await screen.findByText(fr.search.filters.title)).toBeInTheDocument();

    fireEvent.click(screen.getAllByLabelText(fr.search.results.openDetails)[0]);
    expect(screen.getByRole("dialog", { name: fr.search.results.detailsTitle })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(fr.search.results.closeDetails));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: fr.search.results.detailsTitle })).not.toBeInTheDocument();
    });

    const selectionToggle = document.querySelector(".search-result-preview button");
    fireEvent.click(selectionToggle);
    expect(await screen.findByText(`1 ${fr.search.results.selectedImageSingular}`)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(fr.search.results.selectionExpand));
    const relaunchSelectionButton = screen.getByText(fr.search.results.selectionSearchSingle).closest("button");
    await waitFor(() => expect(relaunchSelectionButton).not.toBeDisabled());
    fireEvent.click(relaunchSelectionButton);
    await waitFor(() => expect(searchByIds).toHaveBeenCalled());

    fireEvent.click(screen.getByText(fr.search.image.back));
    expect(onBack).toHaveBeenCalled();
    expect(onChromeToneChange).toHaveBeenCalled();
  });

  it("auto-scrolls image results and guards mode changes after a search", async () => {
    vi.useFakeTimers();
    const restoreMatchMedia = mockReducedMotion(true);
    searchImage.mockResolvedValueOnce(visualPayload);
    const file = new File(["scan"], "scan.png", { type: "image/png" });
    const onChromeToneChange = vi.fn();

    renderWithProviders(<ImageSearchView onBack={vi.fn()} onChromeToneChange={onChromeToneChange} />);

    fireEvent.change(document.querySelector("input[type='file']"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: fr.search.search }));

    await flushFakeTimers(700);
    await flushFakeTimers(0);
    await flushFakeTimers(0);
    await flushFakeTimers(100);

    expect(screen.getByText(fr.search.filters.title)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: fr.search.modeSemantic }));
    expect(screen.getByText(fr.search.image.modeChangeConfirm)).toBeInTheDocument();
    fireEvent.click(screen.getByText(fr.search.image.modeChangeCancel));
    expect(screen.queryByText(fr.search.image.modeChangeConfirm)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: fr.search.modeSemantic }));
    fireEvent.click(screen.getByText(fr.search.image.modeChangeConfirmAction));
    expect(onChromeToneChange).toHaveBeenLastCalledWith("accent");

    restoreMatchMedia();
  });

  it("renders ResultsGrid pagination, exports and controlled selection", async () => {
    const onSelectedIdsChange = vi.fn();
    const onExportJson = vi.fn();
    const onExportCsv = vi.fn();
    const onExportPdf = vi.fn().mockResolvedValue(undefined);
    const externalRef = { current: null };

    renderWithProviders(
      <ResultsGrid
        data={{ ...visualPayload, onRelaunchMultiple: vi.fn() }}
        selectedIds={["img-1"]}
        onSelectedIdsChange={onSelectedIdsChange}
        comparisonSource={{ src: "/query.png", alt: "Query", meta: "query" }}
        cardsGridExternalRef={externalRef}
        desktopLockedHeightClass="locked"
        desktopThreeColumns
        onExportJson={onExportJson}
        onExportCsv={onExportCsv}
        onExportPdf={onExportPdf}
      />,
    );

    fireEvent.click(screen.getByText("PDF"));
    await waitFor(() => expect(onExportPdf).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("JSON")).not.toBeDisabled());
    fireEvent.click(screen.getByText("JSON"));
    await waitFor(() => expect(onExportJson).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("CSV")).not.toBeDisabled());
    fireEvent.click(screen.getByText("CSV"));
    await waitFor(() => expect(onExportCsv).toHaveBeenCalled());

    fireEvent.click(screen.getByLabelText(fr.search.results.nextPage));
    expect(screen.getByText("7")).toBeInTheDocument();

    fireEvent.click(document.querySelector(".search-result-preview button"));
    expect(onSelectedIdsChange).toHaveBeenCalled();

    fireEvent.click(screen.getAllByLabelText(fr.search.results.compareAction)[0]);
    expect(screen.getByRole("dialog", { name: fr.search.results.compareTitle })).toBeInTheDocument();
  });

  it("downloads result images from the details modal and falls back to window.open", async () => {
    vi.stubGlobal("fetch", vi.fn());
    HTMLAnchorElement.prototype.click = vi.fn();

    fetch.mockResolvedValueOnce({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["png"], { type: "image/png" })),
    });

    const { unmount } = renderWithProviders(
      <ResultsGrid data={{ ...semanticPayload, results: [resultRows[0]] }} />,
    );

    fireEvent.click(screen.getByLabelText(fr.search.results.openDetails));
    fireEvent.click(screen.getByLabelText(fr.search.results.downloadImage));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/img-1.png"));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: fr.search.results.detailsTitle })).not.toBeInTheDocument();
    });
    unmount();

    fetch.mockResolvedValueOnce({ ok: false, status: 404 });
    renderWithProviders(
      <ResultsGrid data={{ ...semanticPayload, results: [resultRows[0]] }} />,
    );

    fireEvent.click(screen.getByLabelText(fr.search.results.openDetails));
    fireEvent.click(screen.getByLabelText(fr.search.results.downloadImage));

    await waitFor(() => expect(window.open).toHaveBeenCalledWith("/img-1.png", "_blank", "noopener,noreferrer"));
  });

  it("routes SearchPage views and lazy fallbacks", async () => {
    const onSearchViewChange = vi.fn();
    const onSearchToneChange = vi.fn();
    const { rerender } = renderWithProviders(
      <SearchPage view="hub" onSearchViewChange={onSearchViewChange} onSearchToneChange={onSearchToneChange} />,
    );

    fireEvent.click(screen.getByText("Analyser une image").closest("button"));
    fireEvent.click(screen.getByText("Décrire un cas").closest("button"));
    expect(onSearchViewChange).toHaveBeenCalledWith("image");
    expect(onSearchViewChange).toHaveBeenCalledWith("text");

    rerender(<SearchPage view="text" onSearchViewChange={onSearchViewChange} onSearchToneChange={onSearchToneChange} />);
    await screen.findByText(fr.search.text.headline);
    fireEvent.click(screen.getByText(fr.search.text.back));
    expect(onSearchViewChange).toHaveBeenCalledWith("hub");

    rerender(<SearchPage view="image" onSearchViewChange={onSearchViewChange} onSearchToneChange={onSearchToneChange} />);
    await screen.findByText(fr.search.image.headline);
    fireEvent.click(screen.getByText(fr.search.image.back));
    expect(onSearchViewChange).toHaveBeenCalledWith("hub");

    rerender(<SearchPage view="unknown" />);
    expect(screen.getByText("Analyser une image")).toBeInTheDocument();
  });
});
