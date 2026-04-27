/**
 * @fileoverview Result scrolling utility tests.
 *
 * These tests pin layout measurements and animation frames so result-scroll
 * helpers can be verified without a real browser viewport.
 * @module utils/tests/resultsScrollTest
 */

import { describe, expect, it, vi } from "vitest";

import { getResultsGridScrollTargetY, smoothScrollTo } from "../resultsScroll";

describe("results scroll helpers", () => {
  it("computes bounded scroll targets", () => {
    const gridNode = {
      getBoundingClientRect: () => ({ top: 500 }),
    };
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1200 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 100 });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });

    expect(getResultsGridScrollTargetY(gridNode, 10)).toBe(512);
    expect(getResultsGridScrollTargetY(null)).toBe(0);
  });

  it("smooth-scrolls and can cancel animations", () => {
    vi.useFakeTimers();
    let rafCallback;
    const complete = vi.fn();
    window.requestAnimationFrame = vi.fn((callback) => {
      rafCallback = callback;
      return 1;
    });
    window.cancelAnimationFrame = vi.fn();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });

    const cancel = smoothScrollTo(100, 100, complete);
    rafCallback(performance.now() + 100);

    expect(window.scrollTo).toHaveBeenCalledWith(0, 100);
    expect(complete).toHaveBeenCalled();

    const cancelEarly = smoothScrollTo(200, 100);
    cancelEarly();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(typeof cancel).toBe("function");
  });

  it("completes immediately for tiny distances", () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 100 });
    const complete = vi.fn();

    smoothScrollTo(101, 100, complete);

    expect(complete).toHaveBeenCalled();
  });
});
