const API_BASE = (import.meta.env.VITE_API_BASE || "/api").replace(/\/$/, "");
const JSON_HEADERS = { "Content-Type": "application/json" };

function buildApiUrl(path) {
  return `${API_BASE}${path}`;
}

async function parseJsonSafely(response) {
  return response.json().catch(() => ({}));
}

async function requestJson(path, options = {}) {
  const response = await fetch(buildApiUrl(path), options);

  if (!response.ok) {
    const err = await parseJsonSafely(response);
    throw new Error(err.detail || `Erreur ${response.status}`);
  }

  return parseJsonSafely(response);
}

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
