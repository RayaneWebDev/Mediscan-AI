/**
 * @fileoverview Documentation for context/ThemeContext.
 * @module context/ThemeContext
 */

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  COLOR_PALETTES,
  DEFAULT_PALETTE_ID,
  PALETTE_STORAGE_KEY,
  applyPaletteVariables,
  isPaletteId,
} from "../theme/palettes";
import { ThemeContext } from "./ThemeContextValue";

/**
 * Documentation for context/ThemeContext.
 * @returns {boolean}
 */
function canUseAnimatedViewTransitions() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return !prefersReduced && typeof document.startViewTransition === "function";
}

/**
 * Documentation for context/ThemeContext.
 * @returns {"light"|"dark"}
 */
function getInitialTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Documentation for context/ThemeContext.
 * @returns {string}
 */
function getInitialPalette() {
  const params = new URLSearchParams(window.location.search);
  const paletteFromUrl = params.get("palette");
  if (isPaletteId(paletteFromUrl)) {
    return paletteFromUrl;
  }

  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  if (isPaletteId(stored)) {
    return stored;
  }

  return DEFAULT_PALETTE_ID;
}

/**
 * Documentation for context/ThemeContext.
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [palette, setPaletteState] = useState(getInitialPalette);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.removeAttribute("data-palette");
    root.style.colorScheme = theme;
    applyPaletteVariables(root, theme, palette);
    localStorage.setItem("theme", theme);
    localStorage.setItem(PALETTE_STORAGE_KEY, palette);
  }, [theme, palette]);

  /**
   * Documentation for context/ThemeContext.
   * @param {"light"|"dark"} newTheme
   * @param {number} [clickX]
   * @param {number} [clickY]
   */
  function setTheme(newTheme, clickX, clickY) {
    if (newTheme === theme) return;

    if (!canUseAnimatedViewTransitions()) {
      setThemeState(newTheme);
      return;
    }

    const transition = document.startViewTransition(() => {
      document.documentElement.dataset.theme = newTheme;
      document.documentElement.style.colorScheme = newTheme;
      localStorage.setItem("theme", newTheme);
      flushSync(() => setThemeState(newTheme));
    });

    // Circle expanding from the clicked button center
    transition.ready.then(() => {
      const x = clickX ?? window.innerWidth / 2;
      const y = clickY ?? window.innerHeight / 2;
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      );

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 600,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    });
  }

  /**
   * Change la palette active si l'identifiant est valide.
   * @param {string} newPalette
   */
  function setPalette(newPalette) {
    if (!isPaletteId(newPalette) || newPalette === palette) return;
    setPaletteState(newPalette);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, palette, setPalette, palettes: COLOR_PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
}
