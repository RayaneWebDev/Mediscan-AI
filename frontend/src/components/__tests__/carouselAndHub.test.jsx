/**
 * @fileoverview Carousel and search hub interaction tests.
 *
 * Animation-heavy components need deterministic layout in jsdom. These tests
 * pin carousel geometry and intersection events so navigation, playback, hub
 * intro states, reduced motion, and CTA wiring stay stable.
 * @module components/tests/carouselAndHubTest
 */

import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import FeatureCarousel from "../FeatureCarousel";
import HomePage from "../HomePage";
import SearchHubView from "../SearchHubView";
import { fr } from "../../i18n/fr";
import { renderWithProviders } from "../../test/renderWithProviders";

function defineReadOnlyMetric(node, name, value) {
  Object.defineProperty(node, name, { value, configurable: true });
}

function prepareCarouselGeometry(track) {
  defineReadOnlyMetric(track, "clientWidth", 240);
  defineReadOnlyMetric(track, "scrollWidth", 1200);

  Array.from(track.querySelectorAll("[data-carousel-index]")).forEach((card, index) => {
    defineReadOnlyMetric(card, "offsetLeft", index * 280);
  });

  track.scrollTo = vi.fn(({ left }) => {
    track.scrollLeft = left;
    track.dispatchEvent(new Event("scroll"));
  });
}

function installIntersectingObserver() {
  const OriginalIntersectionObserver = globalThis.IntersectionObserver;

  class IntersectingObserver {
    constructor(callback) {
      this.callback = callback;
      this.disconnect = vi.fn();
    }

    observe(node) {
      this.callback([{ isIntersecting: true, target: node }]);
    }
  }

  globalThis.IntersectionObserver = IntersectingObserver;
  return () => {
    globalThis.IntersectionObserver = OriginalIntersectionObserver;
  };
}

async function flushTimers(ms = 0) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
  await act(async () => {
    await Promise.resolve();
  });
}

describe("carousel and hub interactions", () => {
  it("handles carousel navigation, drag, wheel and slideshow variants", async () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    const items = [
      {
        type: "image",
        label: "Visual demo",
        desc: "Image sequence",
        srcs: ["/a.png", "/b.png"],
        alt: "Visual demo image",
        imageFit: "contain",
        imageBackdrop: true,
      },
      { type: "image", label: "Single image", src: "/single.png", alt: "Single image" },
      { type: "image", label: "Placeholder", alt: "Missing demo" },
      { title: "Unknown icon", desc: "Fallback icon", icon: "unknown" },
    ];

    renderWithProviders(
      <FeatureCarousel
        items={items}
        prevLabel="Previous card"
        nextLabel="Next card"
        regionLabel="Demo carousel"
        tryLabel="Try it"
        onNavigate={onNavigate}
        slideshowInterval={300}
      />,
    );

    const track = screen.getByRole("region", { name: "Demo carousel" });
    prepareCarouselGeometry(track);

    fireEvent.click(screen.getByLabelText("Next card"));
    expect(track.scrollTo).toHaveBeenCalledWith({ left: 280, behavior: "smooth" });

    fireEvent.keyDown(track, { key: "ArrowRight" });
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 560, behavior: "smooth" });

    fireEvent.keyDown(track, { key: "ArrowLeft" });
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 280, behavior: "smooth" });

    fireEvent.click(screen.getByLabelText("Unknown icon (4/4)"));
    expect(track.scrollTo).toHaveBeenLastCalledWith({ left: 840, behavior: "smooth" });

    track.scrollLeft = 40;
    fireEvent.wheel(track, { deltaY: 50, deltaX: 5 });
    expect(track.scrollLeft).toBe(90);

    track.scrollLeft = 100;
    fireEvent.pointerDown(track, { pointerType: "mouse", clientX: 200 });
    fireEvent.pointerMove(window, { clientX: 150 });
    expect(track.scrollLeft).toBe(150);
    fireEvent.pointerUp(window);

    fireEvent.click(screen.getAllByText("Try it")[0]);
    expect(onNavigate).toHaveBeenCalledWith("search");

    await flushTimers(300);
  });

  it("runs synchronized carousel image playback", async () => {
    vi.useFakeTimers();
    renderWithProviders(
      <FeatureCarousel
        items={[
          { type: "image", label: "First", srcs: ["/one.png", "/two.png"], alt: "First demo" },
          { type: "image", label: "Second", srcs: ["/three.png", "/four.png", "/five.png"], alt: "Second demo" },
        ]}
        synchronizedImagePlayback
        slideshowInterval={250}
      />,
    );

    expect(screen.getByAltText("First demo")).toBeInTheDocument();
    await flushTimers(250);
  });

  it("animates SearchHubView and dispatches the two choices", async () => {
    vi.useFakeTimers();
    const restoreObserver = installIntersectingObserver();
    const onChooseImage = vi.fn();
    const onChooseText = vi.fn();

    const { container, unmount } = renderWithProviders(
      <SearchHubView onChooseImage={onChooseImage} onChooseText={onChooseText} />,
    );

    await flushTimers(0);
    expect(container.querySelector(".search-hub-donut-choice")).toHaveAttribute("data-hub-intro", "playing");

    await flushTimers(2400);
    expect(container.querySelector(".search-hub-donut-choice")).toHaveAttribute("data-hub-intro", "done");

    fireEvent.click(screen.getByText(fr.search.hub.imageCard.cta).closest("button"));
    fireEvent.click(screen.getByText(fr.search.hub.textCard.cta).closest("button"));

    expect(onChooseImage).toHaveBeenCalled();
    expect(onChooseText).toHaveBeenCalled();

    unmount();
    restoreObserver();
  });

  it("uses reduced-motion hub state when requested", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn((query) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = renderWithProviders(
      <SearchHubView onChooseImage={vi.fn()} onChooseText={vi.fn()} />,
    );

    expect(container.querySelector(".search-hub-donut-choice")).toHaveAttribute("data-hub-intro", "done");
    window.matchMedia = originalMatchMedia;
  });

  it("animates the home hub and keeps the call-to-action wired", async () => {
    vi.useFakeTimers();
    const restoreObserver = installIntersectingObserver();
    const onPageChange = vi.fn();

    const { container, unmount } = renderWithProviders(<HomePage onPageChange={onPageChange} />);

    await flushTimers(0);
    const hubLayout = container.querySelector(".home-hub-layout");
    expect(hubLayout).toHaveAttribute("data-hub-intro", "playing");

    await flushTimers(2400);
    expect(hubLayout).toHaveAttribute("data-hub-intro", "done");

    fireEvent.click(screen.getByText(fr.home.cta1));
    expect(onPageChange).toHaveBeenCalledWith("search");

    fireEvent.resize(window);
    await flushTimers(0);

    unmount();
    restoreObserver();
  });
});
