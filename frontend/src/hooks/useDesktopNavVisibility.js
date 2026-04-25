/**
 * @fileoverview Hook de visibilité de la navbar desktop au scroll.
 * @module hooks/useDesktopNavVisibility
 */

import { useEffect, useRef, useState } from "react";

const DESKTOP_BREAKPOINT = 768;
const NAV_HIDE_AFTER_Y = 300;
const NAV_SHOW_THRESHOLD = 60;
const TOP_RESET_Y = 10;

/**
 * Masque la navbar en scrollant vers le bas, la réaffiche vers le haut.
 * Inactif sur mobile (< 768px) et quand forceVisible est vrai.
 *
 * @param {{ enabled?: boolean, forceVisible?: boolean }} [options={}]
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
