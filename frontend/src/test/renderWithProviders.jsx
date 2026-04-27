/**
 * @fileoverview Testing helper that renders components with MediScan providers.
 *
 * Component tests use this helper to opt into realistic language/theme context
 * without rendering the full application shell.
 * @module test/renderWithProviders
 */

import { render } from "@testing-library/react";

import { LangContext } from "../context/LangContextValue";
import { ThemeContext } from "../context/ThemeContextValue";
import { fr } from "../i18n/fr";
import { COLOR_PALETTES, DEFAULT_PALETTE_ID } from "../theme/palettes";

/**
 * Default language context value used by frontend tests.
 */
export const defaultLangValue = {
  lang: "fr",
  t: fr,
  setLanguage: () => {},
  langVisible: true,
};

/**
 * Default theme context value used by frontend tests.
 */
export const defaultThemeValue = {
  theme: "light",
  setTheme: () => {},
  palette: DEFAULT_PALETTE_ID,
  setPalette: () => {},
  palettes: COLOR_PALETTES,
};

/**
 * Render a component inside MediScan language and theme providers.
 * @param {React.ReactElement} ui
 * @param {object} [options={}]
 * @param {object} [options.langValue]
 * @param {object} [options.themeValue]
 * @returns {object}
 */
export function renderWithProviders(ui, { langValue = {}, themeValue = {} } = {}) {
  function Providers({ children }) {
    return (
      <ThemeContext.Provider value={{ ...defaultThemeValue, ...themeValue }}>
        <LangContext.Provider value={{ ...defaultLangValue, ...langValue }}>
          {children}
        </LangContext.Provider>
      </ThemeContext.Provider>
    );
  }

  return render(ui, { wrapper: Providers });
}
