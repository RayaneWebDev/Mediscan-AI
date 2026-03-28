const API_BASE = "http://127.0.0.1:8000/api";

export async function searchImage(file, mode, k) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("mode", mode);
  formData.append("k", k);

  const response = await fetch(`${API_BASE}/search`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur ${response.status}`);
  }

  return response.json();
}

export function imageUrl(imageId) {
  return `${API_BASE}/images/${encodeURIComponent(imageId)}`;
}

export async function searchText(text, k) {
  const response = await fetch(`${API_BASE}/search-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, k }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Erreur ${response.status}`);
  }

  return response.json();
}
