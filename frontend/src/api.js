/**
 * @fileoverview HTTP client for MediScan API calls.
 * @module api
 */

// Remove the trailing slash when present
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Clamp a conclusion-context score to the backend's supported similarity range.
 * Non-finite values fall back to zero so the request stays valid.
 * @param {unknown} value
 * @returns {number}
 */
function normalizeConclusionScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.min(1, Math.max(0, numeric));
}

/**
 * Build the full URL for an endpoint.
 * @param {string} path
 * @returns {string}
 */
function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

/**
 * Parse the JSON response without throwing when the body is empty or invalid.
 * @param {Response} response
 * @returns {Promise<object>}
 */
async function parseJsonSafely(response) {
  return response.json().catch(() => ({}));
}

/**
 * Format backend errors into a single user-facing message.
 *
 * FastAPI can return plain strings, validation arrays, or structured objects.
 * Keeping this normalization here prevents each component from duplicating API
 * error-shape handling.
 * @param {string|object|Array} detail
 * @param {string} fallbackMessage
 * @returns {string}
 */
function formatApiError(detail, fallbackMessage) {
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (!item || typeof item !== "object") {
          return String(item);
        }

        const location = Array.isArray(item.loc)
          ? item.loc.filter((part) => part !== "body").join(".")
          : "";
        const message = typeof item.msg === "string" ? item.msg : "";

        if (location && message) {
          return `${location}: ${message}`;
        }
        return message || null;
      })
      .filter(Boolean);

    if (messages.length) {
      return messages.join(" | ");
    }
  }

  if (detail && typeof detail === "object") {
    if (typeof detail.message === "string" && detail.message.trim()) {
      return detail.message;
    }

    try {
      return JSON.stringify(detail);
    } catch {
      return fallbackMessage;
    }
  }

  return fallbackMessage;
}

/**
 * Send an API request and return the JSON payload.
 * Throw an Error with the formatted message when the response is not ok.
 * @param {string} path
 * @param {RequestInit} [options={}]
 * @returns {Promise<object>}
 */
async function requestJson(path, options = {}) {
  const response = await fetch(buildApiUrl(path), options);

  if (!response.ok) {
    const err = await parseJsonSafely(response);
    throw new Error(formatApiError(err.detail, `Erreur ${response.status}`));
  }

  return parseJsonSafely(response);
}

/**
 * Send a JSON POST request to the API.
 * @param {string} path
 * @param {object} payload
 * @returns {Promise<object>}
 */
function postJson(path, payload) {
  return requestJson(path, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}

/**
 * Send a local image to the search engine.
 * @param {File|Blob} file
 * @param {"visual"|"semantic"} mode
 * @param {number} k
 * @returns {Promise<object>}
 */
export async function searchImage(file, mode, k) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("mode", mode);
  formData.append("k", k);

  return requestJson("/search", {
    method: "POST",
    body: formData,
  });
}

/**
 * Build the public URL for an image served through the API.
 * @param {string} imageId
 * @returns {string}
 */
export function imageUrl(imageId) {
  return buildApiUrl(`/images/${encodeURIComponent(imageId)}`);
}

/**
 * Run a text-to-image search.
 * @param {string} text
 * @param {number} k
 * @returns {Promise<object>}
 */
export async function searchText(text, k) {
  return postJson("/search-text", { text, k });
}

/**
 * Re-run a search from one image identifier.
 * @param {string} imageId
 * @param {string} mode
 * @param {number} k
 * @returns {Promise<object>}
 */
export async function searchById(imageId, mode, k) {
  return postJson("/search-by-id", { image_id: imageId, mode, k });
}

/**
 * Re-run a search from multiple image identifiers.
 * @param {string[]} imageIds
 * @param {string} mode
 * @param {number} k
 * @returns {Promise<object>}
 */
export async function searchByIds(imageIds, mode, k) {
  return postJson("/search-by-ids", { image_ids: imageIds, mode, k });
}

/**
 * Reduce a search result to the minimal context accepted by the LLM API.
 * Captions remain server-side to avoid sending free text to the LLM.
 * @param {object} searchResult
 * @returns {object}
 */
function buildConclusionPayload(searchResult) {
  const rows = Array.isArray(searchResult?.results) ? searchResult.results : [];

  return {
    mode: searchResult?.mode,
    embedder: searchResult?.embedder,
    results: rows.slice(0, 5).map((result, index) => ({
      rank: Number.isFinite(Number(result?.rank)) ? Number(result.rank) : index + 1,
      image_id: String(result?.image_id || ""),
      score: normalizeConclusionScore(result?.score),
    })),
  };
}

/**
 * Request assisted clinical conclusion generation.
 * @param {object} searchResult
 * @returns {Promise<object>}
 */
export async function fetchConclusion(searchResult) {
  return postJson("/generate-conclusion", buildConclusionPayload(searchResult));
}

/**
 * Envoie un message de contact au backend.
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function sendContactMessage(payload) {
  return postJson("/contact", payload);
}
