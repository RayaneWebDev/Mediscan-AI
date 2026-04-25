/**
 * @fileoverview Client HTTP de l'API MediScan.
 * @module api
 */

// Supprime le slash final si présent
const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Construit l'URL complète d'un endpoint.
 * @param {string} path
 * @returns {string}
 */
function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

/**
 * Parse la réponse JSON sans lever d'erreur si le body est vide ou invalide.
 * @param {Response} response
 * @returns {Promise<object>}
 */
async function parseJsonSafely(response) {
  return response.json().catch(() => ({}));
}

/**
 * Formate le champ "detail" d'une erreur API en message lisible.
 * Gère les cas string, tableau de validations FastAPI et objet générique.
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
 * Effectue une requête vers l'API et retourne le JSON.
 * Lève une Error avec le message formaté si la réponse n'est pas ok.
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
 * Raccourci POST JSON.
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

export function imageUrl(imageId) {
  return buildApiUrl(`/images/${encodeURIComponent(imageId)}`);
}

export async function searchText(text, k) {
  return postJson("/search-text", { text, k });
}

export async function searchById(imageId, mode, k) {
  return postJson("/search-by-id", { image_id: imageId, mode, k });
}

export async function searchByIds(imageIds, mode, k) {
  return postJson("/search-by-ids", { image_ids: imageIds, mode, k });
}

export async function fetchConclusion(searchResult) {
  return postJson("/generate-conclusion", searchResult);
}

export async function sendContactMessage(payload) {
  return postJson("/contact", payload);
}
