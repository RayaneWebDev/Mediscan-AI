/**
 * @fileoverview Vitest setup file for browser API mocks.
 *
 * jsdom lacks several browser APIs used by the app. This setup provides stable
 * defaults for storage, scrolling, media queries, animation frames, object URLs,
 * clipboard access, and layout-adjacent primitives.
 * @module test/setup
 */

import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

const storage = new Map();
const localStorageMock = {
  getItem: vi.fn((key) => (storage.has(key) ? storage.get(key) : null)),
  setItem: vi.fn((key, value) => {
    storage.set(key, String(value));
  }),
  removeItem: vi.fn((key) => {
    storage.delete(key);
  }),
  clear: vi.fn(() => {
    storage.clear();
  }),
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!window.IntersectionObserver) {
  window.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(window, "requestAnimationFrame", {
  configurable: true,
  writable: true,
  value: vi.fn((callback) => window.setTimeout(() => callback(performance.now()), 0)),
});

Object.defineProperty(window, "cancelAnimationFrame", {
  configurable: true,
  writable: true,
  value: vi.fn((id) => window.clearTimeout(id)),
});

Object.defineProperty(globalThis, "requestAnimationFrame", {
  configurable: true,
  writable: true,
  value: window.requestAnimationFrame,
});

Object.defineProperty(globalThis, "cancelAnimationFrame", {
  configurable: true,
  writable: true,
  value: window.cancelAnimationFrame,
});

Object.defineProperty(window.URL, "createObjectURL", {
  configurable: true,
  value: vi.fn(() => "blob:mock-url"),
});

Object.defineProperty(window.URL, "revokeObjectURL", {
  configurable: true,
  value: vi.fn(),
});

Object.defineProperty(window, "open", {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  value: {
    writeText: vi.fn(),
  },
});
