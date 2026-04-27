/**
 * @fileoverview API client tests for request formatting and error handling.
 *
 * These tests treat frontend/src/api.js as the browser contract for backend
 * communication: request shape, URL encoding, payload trimming, empty responses,
 * and FastAPI-style error formatting are all covered here.
 * @module api/tests/apiTest
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchConclusion,
  imageUrl,
  searchById,
  searchByIds,
  searchImage,
  searchText,
  sendContactMessage,
} from "../../api";

function jsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload),
  };
}

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("builds proxied image urls with encoded ids", () => {
    expect(imageUrl("img 1/2")).toBe("/api/images/img%201%2F2");
  });

  it("posts multipart image search payloads", async () => {
    fetch.mockResolvedValue(jsonResponse({ results: [] }));
    const file = new File(["data"], "scan.png", { type: "image/png" });

    await expect(searchImage(file, "visual", 5)).resolves.toEqual({ results: [] });

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/search");
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("image")).toBe(file);
    expect(options.body.get("mode")).toBe("visual");
    expect(options.body.get("k")).toBe("5");
  });

  it("posts JSON payloads to public endpoints", async () => {
    fetch.mockResolvedValue(jsonResponse({ ok: true }));

    await searchText("lung", 3);
    await searchById("img-1", "semantic", 4);
    await searchByIds(["img-1", "img-2"], "visual", 5);
    await fetchConclusion({ image_id: "img-1" });
    await sendContactMessage({ email: "user@example.com", message: "Hello" });

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/search-text",
      "/api/search-by-id",
      "/api/search-by-ids",
      "/api/generate-conclusion",
      "/api/contact",
    ]);
    expect(fetch.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "lung", k: 3 }),
    });
  });

  it("returns empty objects for successful responses without JSON", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn().mockRejectedValue(new Error("no body")),
    });

    await expect(searchText("lung", 1)).resolves.toEqual({});
  });

  it("formats string API errors", async () => {
    fetch.mockResolvedValue(jsonResponse({ detail: "Bad request" }, { ok: false, status: 400 }));

    await expect(searchText("lung", 1)).rejects.toThrow("Bad request");
  });

  it("formats FastAPI validation errors", async () => {
    fetch.mockResolvedValue(
      jsonResponse(
        { detail: [{ loc: ["body", "text"], msg: "Field required" }, "raw error"] },
        { ok: false, status: 422 },
      ),
    );

    await expect(searchText("", 1)).rejects.toThrow("text: Field required | raw error");
  });

  it("formats object API errors and falls back when JSON parsing fails", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ detail: { message: "Object message" } }, { ok: false, status: 500 }),
    );
    await expect(searchText("lung", 1)).rejects.toThrow("Object message");

    const circularDetail = {};
    circularDetail.self = circularDetail;
    fetch.mockResolvedValueOnce(jsonResponse({ detail: circularDetail }, { ok: false, status: 500 }));
    await expect(searchText("lung", 1)).rejects.toThrow("Erreur 500");

    fetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: vi.fn().mockRejectedValue(new Error("invalid json")),
    });
    await expect(searchText("lung", 1)).rejects.toThrow("Erreur 503");
  });

  it("formats sparse validation errors and trims conclusion rows", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(
        { detail: [{ loc: ["body", "text"] }, { msg: "Only message" }, null] },
        { ok: false, status: 422 },
      ),
    );
    await expect(searchText("", 1)).rejects.toThrow("Only message");

    fetch.mockResolvedValueOnce(jsonResponse({ ok: true }));
    await fetchConclusion({
      mode: "visual",
      embedder: "fake",
      results: Array.from({ length: 8 }, (_, index) => ({
        rank: index === 0 ? "bad" : String(index + 1),
        image_id: index === 1 ? null : `img-${index}`,
        score: index === 2 ? "bad" : String(0.9 - index * 0.1),
      })),
    });

    const body = JSON.parse(fetch.mock.calls.at(-1)[1].body);
    expect(body.results).toHaveLength(6);
    expect(body.results[0]).toMatchObject({ rank: 1, image_id: "img-0" });
    expect(body.results[1]).toMatchObject({ image_id: "" });
    expect(body.results[2]).toMatchObject({ score: 0 });
  });
});
