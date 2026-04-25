/**
 * @fileoverview Provider de thème (clair/sombre) et de palette de couleurs.
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

// Vérifie si View Transitions API est disponible et que l'utilisateur accepte les animations
function canUseAnimatedViewTransitions() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return false;
  }

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return !prefersReduced && typeof document.startViewTransition === "function";
}

// Lit le thème initial depuis localStorage ou la préférence système
function getInitialTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Lit la palette initiale depuis l'URL ou localStorage
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

    // Cercle qui s'étend depuis le centre du bouton cliqué
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
