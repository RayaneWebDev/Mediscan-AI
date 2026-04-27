/**
 * @fileoverview Context provider tests for language and theme state.
 *
 * The provider tests protect global UI state: language fallback, View Transition
 * integration, theme/palette persistence, URL palette bootstrapping, and the
 * error guard for useTheme outside ThemeProvider.
 * @module context/tests/contextsTest
 */

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LangProvider } from "../LangContext";
import { LangContext } from "../LangContextValue";
import { ThemeProvider } from "../ThemeContext";
import { ThemeContext } from "../ThemeContextValue";
import { useTheme } from "../useTheme";
import { COLOR_PALETTES, DEFAULT_PALETTE_ID, PALETTE_STORAGE_KEY } from "../../theme/palettes";
import { renderWithProviders } from "../../test/renderWithProviders";

function LangProbe() {
  return (
    <LangContext.Consumer>
      {({ lang, setLanguage, langVisible }) => (
        <>
          <span data-testid="lang">{lang}</span>
          <span data-testid="visible">{String(langVisible)}</span>
          <button type="button" onClick={() => setLanguage("fr")}>fr</button>
          <button type="button" onClick={() => setLanguage("en")}>en</button>
        </>
      )}
    </LangContext.Consumer>
  );
}

function ThemeProbe() {
  const context = useTheme();
  return (
    <>
      <span data-testid="theme">{context.theme}</span>
      <span data-testid="palette">{context.palette}</span>
      <button type="button" onClick={() => context.setTheme("dark", 10, 20)}>dark</button>
      <button type="button" onClick={() => context.setTheme("dark")}>dark-auto</button>
      <button type="button" onClick={() => context.setTheme("light")}>light</button>
      <button type="button" onClick={() => context.setPalette("mineral")}>mineral</button>
      <button type="button" onClick={() => context.setPalette("missing")}>missing</button>
    </>
  );
}

describe("React contexts", () => {
  it("provides language state and fallback transitions", async () => {
    vi.useFakeTimers();
    localStorage.setItem("lang", "fr");
    window.matchMedia = vi.fn(() => ({ matches: false }));

    renderWithProviders(
      <LangProvider>
        <LangProbe />
      </LangProvider>,
    );

    expect(screen.getByTestId("lang")).toHaveTextContent("fr");
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getByTestId("visible")).toHaveTextContent("false");

    await act(async () => {
      vi.advanceTimersByTime(160);
    });

    expect(screen.getByTestId("lang")).toHaveTextContent("en");
    expect(localStorage.getItem("lang")).toBe("en");
  });

  it("uses View Transition API for language switches when available", async () => {
    localStorage.setItem("lang", "en");
    window.matchMedia = vi.fn(() => ({ matches: false }));
    document.documentElement.animate = vi.fn();
    document.startViewTransition = vi.fn((callback) => {
      callback();
      return { ready: Promise.resolve() };
    });

    renderWithProviders(
      <LangProvider>
        <LangProbe />
      </LangProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(document.startViewTransition).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "fr" }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId("lang")).toHaveTextContent("fr");
    expect(document.startViewTransition).toHaveBeenCalled();
    expect(document.documentElement.animate).toHaveBeenCalledTimes(2);

    delete document.startViewTransition;
  });

  it("provides theme state, palette state and guarded updates", () => {
    localStorage.setItem("theme", "light");
    localStorage.setItem(PALETTE_STORAGE_KEY, DEFAULT_PALETTE_ID);
    window.matchMedia = vi.fn(() => ({ matches: false }));

    renderWithProviders(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("palette")).toHaveTextContent(DEFAULT_PALETTE_ID);

    fireEvent.click(screen.getByText("dark"));
    fireEvent.click(screen.getByText("mineral"));
    fireEvent.click(screen.getByText("missing"));

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("palette")).toHaveTextContent("mineral");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(Object.keys(COLOR_PALETTES)).toContain("mineral");
  });

  it("uses URL palettes and View Transition API for theme switches", async () => {
    window.history.pushState({}, "", "/?palette=mineral");
    localStorage.removeItem("theme");
    localStorage.removeItem(PALETTE_STORAGE_KEY);
    window.matchMedia = vi.fn((query) => ({ matches: query.includes("prefers-color-scheme") }));
    document.documentElement.animate = vi.fn();
    document.startViewTransition = vi.fn((callback) => {
      callback();
      return { ready: Promise.resolve() };
    });

    renderWithProviders(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("palette")).toHaveTextContent("mineral");

    fireEvent.click(screen.getByText("light"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.startViewTransition).toHaveBeenCalled();
    expect(document.documentElement.animate).toHaveBeenCalled();

    fireEvent.click(screen.getByText("dark-auto"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    delete document.startViewTransition;
    window.history.pushState({}, "", "/");
  });

  it("throws when useTheme is used outside a ThemeProvider", () => {
    function BrokenProbe() {
      useTheme();
      return null;
    }

    expect(() => render(<BrokenProbe />)).toThrow();
  });
});
