/**
 * @fileoverview Scroll-aware desktop navigation visibility hook.
 * @module hooks/useDesktopNavVisibility
 */

import { useEffect, useRef, useState } from "react";

const DESKTOP_BREAKPOINT = 768;
const NAV_HIDE_AFTER_Y = 300;
const NAV_SHOW_THRESHOLD = 60;
const TOP_RESET_Y = 10;

/**
 * Hide the desktop navigation while scrolling down and reveal it while scrolling up.
 *
 * The hook stays inactive on mobile widths and when forceVisible is enabled, so
 * page-specific overlays can pin the navigation without duplicating scroll logic.
 *
 * @param {object} [options={}]
 * @param {boolean} [options.enabled]
 * @param {boolean} [options.forceVisible]
 * @returns {boolean}
 */
export default function useDesktopNavVisibility({
  enabled = true,
  forceVisible = false,
} = {}) {
  const [isVisible, setIsVisible] = useState(true);

  const lastY = useRef(0);
  const turnY = useRef(0);
  const goingDown = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let frameId = 0;

    /**
     * Compute visibility from scroll direction, threshold, and viewport width.
     */
    const updateVisibility = () => {
      const y = window.scrollY;
      const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;

      if (!enabled || forceVisible || !isDesktop) {
        setIsVisible(true);
        lastY.current = y;
        turnY.current = y;
        goingDown.current = false;
        return;
      }

      const down = y > lastY.current;

      if (down !== goingDown.current) {
        turnY.current = lastY.current;
        goingDown.current = down;
      }

      if (down && y > NAV_HIDE_AFTER_Y) {
        setIsVisible(false);
      }

      if (!down && turnY.current - y > NAV_SHOW_THRESHOLD) {
        setIsVisible(true);
      }

      if (y <= TOP_RESET_Y) {
        setIsVisible(true);
      }

      lastY.current = y;
    };

    /**
     * Batch scroll/resize updates into one animation-frame callback.
     */
    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateVisibility);
    };

    scheduleUpdate();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [enabled, forceVisible]);

  return isVisible;
}
