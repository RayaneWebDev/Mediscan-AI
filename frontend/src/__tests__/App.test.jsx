/**
 * @fileoverview Application integration tests for route changes, providers, and page composition.
 *
 * These tests keep the real App state machine under test while replacing heavy
 * page components with focused doubles. They verify routing, search subviews,
 * page transitions, body-scroll cleanup, and idle preloading without depending
 * on every child page's full DOM.
 * @module tests/AppTest
 */

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import App from "../App";

vi.mock("../components/Navigation", () => ({
  default: function MockNavigation({ currentPage, onPageChange, visible, tone }) {
    return (
      <nav data-testid="mock-nav">
        <span>{`page=${currentPage}`}</span>
        <span>{`visible=${visible}`}</span>
        <span>{`tone=${tone}`}</span>
        <button type="button" onClick={() => onPageChange("home")}>nav-home</button>
        <button type="button" onClick={() => onPageChange("search")}>nav-search</button>
        <button type="button" onClick={() => onPageChange("about")}>nav-about</button>
        <button type="button" onClick={() => onPageChange("missing")}>nav-invalid</button>
      </nav>
    );
  },
}));

vi.mock("../components/HomePage", () => ({
  default: function MockHomePage({ onPageChange }) {
    return (
      <section data-testid="page-home">
        <button type="button" onClick={() => onPageChange("search")}>home-search</button>
      </section>
    );
  },
}));

vi.mock("../components/SearchPage", () => ({
  default: function MockSearchPage({ view, onSearchViewChange, onSearchToneChange }) {
    return (
      <section data-testid="page-search">
        <span>{`view=${view}`}</span>
        <button type="button" onClick={() => onSearchViewChange("image")}>choose-image</button>
        <button type="button" onClick={() => onSearchViewChange("text")}>choose-text</button>
        <button type="button" onClick={() => onSearchViewChange("invalid")}>choose-invalid</button>
        <button type="button" onClick={() => onSearchToneChange("accent")}>tone-accent</button>
      </section>
    );
  },
}));

vi.mock("../components/ContactPage", () => ({
  default: function MockContactPage({ onPageChange }) {
    return (
      <section data-testid="page-contact">
        <button type="button" onClick={() => onPageChange("faq")}>contact-faq</button>
      </section>
    );
  },
}));

vi.mock("../components/HowItWorks", () => ({
  default: function MockHowItWorks() {
    return <section data-testid="page-how" />;
  },
}));

vi.mock("../components/FAQPage", () => ({
  default: function MockFAQPage() {
    return <section data-testid="page-faq" />;
  },
}));

vi.mock("../components/AboutPage", () => ({
  default: function MockAboutPage() {
    return <section data-testid="page-about" />;
  },
}));

vi.mock("../components/Footer", () => ({
  default: function MockFooter({ onPageChange }) {
    return (
      <footer data-testid="mock-footer">
        <button type="button" onClick={() => onPageChange("contact")}>footer-contact</button>
      </footer>
    );
  },
}));

vi.mock("../components/Spinner", () => ({
  default: function MockSpinner({ label }) {
    return <div role="status">{label}</div>;
  },
}));

async function advanceTimers(ms) {
  await act(async () => {
    await new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  });
}

async function finishPageTransition() {
  await advanceTimers(240);
  await advanceTimers(0);
}

describe("App", () => {
  afterEach(() => {
    delete window.requestIdleCallback;
    delete window.cancelIdleCallback;
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  it("normalizes routes and drives search subviews with page transitions", async () => {
    render(<App />);

    expect(screen.getByTestId("page-home")).toBeInTheDocument();
    expect(screen.getByTestId("mock-nav")).toHaveTextContent("visible=false");

    fireEvent.click(screen.getByText("nav-home"));
    expect(screen.getByTestId("page-home")).toBeInTheDocument();

    await advanceTimers(180);
    expect(screen.getByTestId("mock-nav")).toHaveTextContent("visible=true");

    fireEvent.click(screen.getByText("nav-search"));
    await finishPageTransition();

    expect(await screen.findByTestId("page-search")).toHaveTextContent("view=hub");
    expect(screen.queryByTestId("mock-footer")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("choose-image"));
    await finishPageTransition();
    expect(await screen.findByTestId("page-search")).toHaveTextContent("view=image");
    expect(screen.getByTestId("mock-nav")).toHaveTextContent("tone=primary");

    fireEvent.click(screen.getByText("tone-accent"));
    fireEvent.click(screen.getByText("tone-accent"));
    await waitFor(() => expect(screen.getByTestId("mock-nav")).toHaveTextContent("tone=accent"));

    fireEvent.click(screen.getByText("choose-invalid"));
    await finishPageTransition();
    expect(await screen.findByTestId("page-search")).toHaveTextContent("view=hub");

    fireEvent.click(screen.getByText("nav-invalid"));
    await finishPageTransition();
    expect(await screen.findByTestId("page-home")).toBeInTheDocument();
  });

  it("handles static pages, body scroll lock cleanup and idle preloading", async () => {
    window.requestIdleCallback = vi.fn((callback) => {
      callback();
      return 42;
    });
    window.cancelIdleCallback = vi.fn();
    Object.defineProperty(window, "scrollY", { value: 64, configurable: true });

    const { unmount } = render(<App />);

    fireEvent.click(screen.getByText("footer-contact"));
    expect(document.body.style.position).toBe("fixed");
    await finishPageTransition();
    expect(await screen.findByTestId("page-contact")).toBeInTheDocument();
    expect(document.body.style.position).toBe("");

    fireEvent.click(screen.getByText("contact-faq"));
    await finishPageTransition();
    expect(await screen.findByTestId("page-faq")).toBeInTheDocument();

    fireEvent.click(screen.getByText("nav-about"));
    await finishPageTransition();
    expect(await screen.findByTestId("page-about")).toBeInTheDocument();

    unmount();
    expect(window.cancelIdleCallback).toHaveBeenCalledWith(42);
  });
});
