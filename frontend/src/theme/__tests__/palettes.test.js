/**
 * @fileoverview Theme palette validation tests.
 *
 * Palette tests cover both data validation and CSS variable application so
 * persisted palette identifiers remain safe for the UI.
 * @module theme/tests/palettesTest
 */

import { describe, expect, it } from "vitest";

import {
  COLOR_PALETTES,
  DEFAULT_PALETTE_ID,
  applyPaletteVariables,
  getPalette,
  isPaletteId,
} from "../palettes";

describe("palettes", () => {
  it("validates palette ids and falls back safely", () => {
    expect(isPaletteId(DEFAULT_PALETTE_ID)).toBe(true);
    expect(isPaletteId("missing")).toBe(false);
    expect(isPaletteId(null)).toBe(false);
    expect(getPalette("missing", "missing")).toEqual(COLOR_PALETTES[DEFAULT_PALETTE_ID].light);
  });

  it("returns requested palettes and applies CSS variables", () => {
    const root = document.createElement("div");

    expect(getPalette("dark", DEFAULT_PALETTE_ID)).toBe(COLOR_PALETTES[DEFAULT_PALETTE_ID].dark);
    applyPaletteVariables(root, "light", DEFAULT_PALETTE_ID);

    expect(root.style.getPropertyValue("--palette-title")).toBeTruthy();
    expect(root.style.getPropertyValue("--palette-primary")).toBeTruthy();
  });
});
