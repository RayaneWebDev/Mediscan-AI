/**
 * @fileoverview Translation dictionary completeness tests.
 *
 * The translation dictionaries are compared at the top level so components can
 * rely on both languages exposing the same major UI sections.
 * @module i18n/tests/translationsTest
 */

import { describe, expect, it } from "vitest";

import { en } from "../en";
import { fr } from "../fr";

describe("translation dictionaries", () => {
  it("exposes matching top-level translation sections", () => {
    expect(new Set(Object.keys(en))).toEqual(new Set(Object.keys(fr)));
    expect(en.nav.home).toBeTruthy();
    expect(fr.search.results.detailsTitle).toBeTruthy();
  });
});
