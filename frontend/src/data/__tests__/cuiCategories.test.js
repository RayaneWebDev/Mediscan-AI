/**
 * @fileoverview CUI category data integrity tests.
 *
 * This test keeps the curated CUI taxonomy usable by filters by checking the
 * expected category groups and label fields consumed by the UI.
 * @module data/tests/cuiCategoriesTest
 */

import { describe, expect, it } from "vitest";

import { CUI_TYPES } from "../cuiCategories";

describe("CUI category data", () => {
  it("exposes modalite, anatomie and finding categories", () => {
    expect(Object.keys(CUI_TYPES)).toEqual(["modalite", "anatomie", "finding"]);
    expect(CUI_TYPES.modalite[0]).toEqual(
      expect.objectContaining({ cui: expect.any(String), label_fr: expect.any(String), label_en: expect.any(String) }),
    );
  });
});
