/**
 * @fileoverview Shared search view helper tests.
 *
 * These tests cover helper behavior shared by image and text search screens:
 * timer cleanup, CUI option derivation, guide-note highlighting, class generation,
 * and reduced-motion-aware guide scrolling.
 * @module utils/tests/searchViewHelpersTest
 */

import { describe, expect, it, vi } from "vitest";

import {
  buildAvailableCuiByType,
  clearTimeoutRef,
  getGuideHighlightClasses,
  getSelectedCaptionFilters,
  restartNoteHighlight,
  scrollToInfoSection,
} from "../searchViewHelpers";

describe("search view helpers", () => {
  it("clears timeout refs and maps selected filters", () => {
    const clearSpy = vi.spyOn(window, "clearTimeout");
    clearTimeoutRef({ current: 12 });

    expect(clearSpy).toHaveBeenCalledWith(12);
    expect(
      getSelectedCaptionFilters(["a", "missing"], [{ id: "a", terms: ["x"] }]),
    ).toEqual([{ id: "a", terms: ["x"] }]);
  });

  it("builds available CUI groups from rows", () => {
    const rows = [{ cui: JSON.stringify(["M1", "A1"]) }, { cui: "F1" }];
    const cuiTypes = {
      modalite: [{ cui: "M1" }, { cui: "M2" }],
      anatomie: [{ cui: "A1" }],
      finding: [{ cui: "F1" }],
      ignored: [{ cui: "X" }],
    };

    expect(buildAvailableCuiByType(rows, cuiTypes)).toEqual({
      modalite: [{ cui: "M1" }],
      anatomie: [{ cui: "A1" }],
      finding: [{ cui: "F1" }],
    });
  });

  it("restarts highlight timers", () => {
    vi.useFakeTimers();
    const setter = vi.fn();
    const timerRef = { current: 5 };

    restartNoteHighlight(setter, timerRef);
    expect(setter).toHaveBeenCalledWith(false);

    vi.runOnlyPendingTimers();
    expect(setter).toHaveBeenCalledWith(true);

    vi.advanceTimersByTime(2200);
    expect(setter).toHaveBeenLastCalledWith(false);
  });

  it("returns guide highlight classes by tone", () => {
    expect(getGuideHighlightClasses(false)).toEqual({
      icon: "",
      heading: "",
      chip: "",
      title: "",
      copy: "",
    });
    expect(getGuideHighlightClasses(true, "primary").icon).toContain("primary");
    expect(getGuideHighlightClasses(true).icon).toContain("accent");
  });

  it("scrolls to info sections and supports reduced motion", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <section id="section"></section>
      <span id="eyebrow"></span>
    `;
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    document.getElementById("eyebrow").getBoundingClientRect = () => ({ top: 500 });
    const onComplete = vi.fn();
    const scrollTimerRef = { current: 1 };

    scrollToInfoSection({ sectionId: "section", eyebrowId: "eyebrow", scrollTimerRef, onComplete });

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 422, behavior: "smooth" });
    vi.advanceTimersByTime(760);
    expect(onComplete).toHaveBeenCalled();

    window.matchMedia = vi.fn(() => ({ matches: true }));
    scrollToInfoSection({ sectionId: "section", scrollTimerRef, onComplete });
    expect(window.scrollTo).toHaveBeenCalledWith(0, expect.any(Number));

    expect(scrollToInfoSection({ sectionId: "missing", scrollTimerRef })).toBeUndefined();
  });
});
