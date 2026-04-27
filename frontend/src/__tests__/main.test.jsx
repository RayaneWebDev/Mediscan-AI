/**
 * @fileoverview React entrypoint tests for mounting the application root.
 *
 * This small test protects the Vite/React bootstrap contract: the app must mount
 * on the static #root element and render the top-level App component.
 * @module tests/mainTest
 */

import { describe, expect, it, vi } from "vitest";

describe("main entrypoint", () => {
  it("mounts the React app on the root element", async () => {
    vi.resetModules();
    document.body.innerHTML = '<div id="root"></div>';

    const render = vi.fn();
    const createRoot = vi.fn(() => ({ render }));

    vi.doMock("react-dom/client", () => ({ createRoot }));
    vi.doMock("../App.jsx", () => ({
      default: function MockApp() {
        return <div>MediScan</div>;
      },
    }));

    await import("../main.jsx");

    expect(createRoot).toHaveBeenCalledWith(document.getElementById("root"));
    expect(render).toHaveBeenCalled();
  });
});
