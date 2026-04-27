/**
 * @fileoverview Desktop navigation visibility hook tests.
 *
 * The hook depends on scroll direction and viewport width, so these tests pin
 * both values and make animation frames immediate for predictable assertions.
 * @module hooks/tests/useDesktopNavVisibilityTest
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import useDesktopNavVisibility from "../useDesktopNavVisibility";

function setViewport({ width, scrollY }) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
}

function makeAnimationFramesImmediate() {
  const raf = (callback) => {
    callback();
    return 1;
  };
  Object.defineProperty(window, "requestAnimationFrame", { configurable: true, value: raf });
  Object.defineProperty(globalThis, "requestAnimationFrame", { configurable: true, value: raf });
  Object.defineProperty(window, "cancelAnimationFrame", { configurable: true, value: () => {} });
  Object.defineProperty(globalThis, "cancelAnimationFrame", { configurable: true, value: () => {} });
}

describe("useDesktopNavVisibility", () => {
  it("hides on desktop scroll down and shows after scrolling up", () => {
    makeAnimationFramesImmediate();
    setViewport({ width: 1200, scrollY: 0 });
    const { result } = renderHook(() => useDesktopNavVisibility());

    expect(result.current).toBe(true);

    act(() => {
      setViewport({ width: 1200, scrollY: 400 });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(false);

    act(() => {
      setViewport({ width: 1200, scrollY: 320 });
      window.dispatchEvent(new Event("scroll"));
    });

    expect(result.current).toBe(true);
  });

  it("stays visible when disabled, forced or mobile", () => {
    makeAnimationFramesImmediate();
    setViewport({ width: 500, scrollY: 500 });
    const { result, rerender } = renderHook(
      ({ enabled, forceVisible }) => useDesktopNavVisibility({ enabled, forceVisible }),
      { initialProps: { enabled: false, forceVisible: false } },
    );

    expect(result.current).toBe(true);

    rerender({ enabled: true, forceVisible: true });
    expect(result.current).toBe(true);

    rerender({ enabled: true, forceVisible: false });
    expect(result.current).toBe(true);
  });
});
