/**
 * @fileoverview Documentation for context/useTheme.
 * @module context/useTheme
 */

import { useContext } from "react";
import { ThemeContext } from "./ThemeContextValue";

/**
 * Documentation for context/useTheme.
 * @returns {{theme: string, setTheme: function, palette: string, setPalette: function, palettes: Array}
 * @throws {Error}
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
