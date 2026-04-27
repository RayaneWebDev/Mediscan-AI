/**
 * @fileoverview Search-result filtering, score formatting, and export helpers.
 * @module utils/searchResults
 */


/**
 * Return the result rows from either a raw array or the standard API payload.
 * @param {object|Array|null} payload
 * @returns {Array}
 */
function getResultRows(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  return Array.isArray(payload.results) ? payload.results : [];
}

/**
 * Convert a cosine-like similarity score in [-1, 1] to a display percentage.
 * @param {number} score
 * @returns {number}
 */
export function similarityScoreToPercent(score) {
  const boundedScore = Number.isFinite(score) ? Math.min(1, Math.max(-1, score)) : 0;
  return Math.round(((boundedScore + 1) / 2) * 100);
}

/**
 * Curated caption filters used to suggest common radiology terms.
 *
 * The labels stay short for filter chips while terms include common spelling
 * variants used in ROCO captions.
 * @type {Array<{id: string, label: string, terms: string[]}>}
 */
export const CURATED_CAPTION_FILTERS = [
  { id: "xray", label: "X-ray", terms: ["xray", "x-ray", "radiograph"] },
  { id: "ct", label: "CT", terms: ["ct", "computed tomography"] },
  { id: "mri", label: "MRI", terms: ["mri", "magnetic resonance"] },
  { id: "ultrasound", label: "Ultrasound", terms: ["ultrasound", "sonography", "sonogram"] },
  { id: "chest", label: "Chest", terms: ["chest", "thorax", "thoracic"] },
  { id: "lung", label: "Lung", terms: ["lung", "pulmonary"] },
  { id: "brain", label: "Brain", terms: ["brain", "cranial", "intracranial"] },
  { id: "spine", label: "Spine", terms: ["spine", "spinal", "vertebral"] },
  { id: "abdomen", label: "Abdomen", terms: ["abdomen", "abdominal"] },
  { id: "fracture", label: "Fracture", terms: ["fracture", "fractured"] },
  { id: "lesion", label: "Lesion", terms: ["lesion", "lesions"] },
  { id: "opacity", label: "Opacity", terms: ["opacity", "opacities"] },
  { id: "mass", label: "Mass", terms: ["mass", "masses"] },
  { id: "edema", label: "Edema", terms: ["edema", "oedema"] },
  { id: "nodule", label: "Nodule", terms: ["nodule", "nodules"] },
];

/**
 * Normalize free-text filter values for case-insensitive and accent-insensitive matching.
 * @param {*} value
 * @returns {string}
 */
function normalizeFilterValue(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Escape user-entered text before embedding it in a regular expression.
 * @param {string} value
 * @returns {string}
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Match a normalized term against word boundaries inside a normalized source.
 *
 * Boundary matching prevents short terms from accidentally matching unrelated
 * substrings while still allowing flexible whitespace in multi-word terms.
 * @param {string} source
 * @param {string} term
 * @returns {boolean}
 */
function matchesNormalizedTerm(source, term) {
  const normalizedSource = normalizeFilterValue(source);
  const normalizedTerm = normalizeFilterValue(term);

  if (!normalizedSource || !normalizedTerm) {
    return false;
  }

  const boundaryPattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(normalizedTerm).replace(/\\ /g, "\\s+")}(?=$|[^a-z0-9])`,
  );

  return boundaryPattern.test(normalizedSource);
}

/**
 * Check whether a caption matches at least one term from a curated term group.
 * @param {string} caption
 * @param {string[]} termGroup
 * @returns {boolean}
 */
function matchesCaptionTermGroup(caption, termGroup) {
  if (!Array.isArray(termGroup) || !termGroup.length) {
    return true;
  }

  return termGroup.some((term) => matchesNormalizedTerm(caption, term));
}

/**
 * Normalize the CUI field regardless of whether it arrived as a string or array.
 * @param {object} result
 * @returns {string}
 */
function getNormalizedResultCui(result) {
  if (!result) {
    return "";
  }

  if (Array.isArray(result.cui)) {
    return normalizeFilterValue(result.cui.filter(Boolean).join(" "));
  }

  return normalizeFilterValue(result.cui);
}

/**
 * Extract a stable uppercase CUI set from a result row.
 *
 * Backend rows can expose CUIs as arrays, JSON-encoded arrays, or raw strings
 * depending on the source artifact. This helper gives filters one consistent
 * representation.
 * @param {object} result
 * @returns {Set<string>}
 */
export function getResultCuiSet(result) {
  if (!result?.cui) return new Set();
  const cui = result.cui;
  if (Array.isArray(cui)) {
    return new Set(cui.filter(Boolean).map((c) => String(c).trim().toUpperCase()));
  }
  try {
    const parsed = JSON.parse(cui);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter(Boolean).map((c) => String(c).trim().toUpperCase()));
    }
  } catch {
    // not JSON
  }
  const raw = String(cui).trim().toUpperCase();
  return raw ? new Set([raw]) : new Set();
}

/**
 * Suggest caption filters that actually match the current result set.
 * @param {object[]} rows
 * @param {number} [limit=8]
 * @returns {Array<{id: string, label: string, terms: string[], count: number}>}
 */
export function getSuggestedCaptionFilters(rows, limit = 8) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  return CURATED_CAPTION_FILTERS
    .map((entry) => ({
      ...entry,
      count: rows.reduce(
        (total, row) => total + (matchesCaptionTermGroup(row?.caption, entry.terms) ? 1 : 0),
        0,
      ),
    }))
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

/**
 * Trigger a browser download and revoke the generated object URL afterward.
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

/**
 * Fetch an image and convert it to a data URL for PDF embedding.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function loadImageAsBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/**
 * Apply all client-side result filters and sorting without mutating the source payload.
 *
 * The returned object keeps the original payload metadata, replacing only the
 * results array so downstream export and grid components can consume the same shape.
 *
 * @param {object|null} payload
 * @param {object} [options={}]
 * @param {number} [options.minScore=0]
 * @param {string} [options.captionFilter=""]
 * @param {"asc"|"desc"} [options.sortOrder="desc"]
 * @param {string} [options.cuiFilter=""]
 * @param {"all"|"with"|"without"} [options.cuiPresence="all"]
 * @param {string} [options.cuiModalite=""]
 * @param {string} [options.cuiAnatomie=""]
 * @param {string} [options.cuiFinding=""]
 * @param {string} [options.referenceFilter=""]
 * @param {string[][]} [options.captionTermGroups=[]]
 * @returns {object|null}
 */
export function filterResultsPayload(
  payload,
  {
    minScore = 0,
    captionFilter = "",
    sortOrder = "desc",
    cuiFilter = "",
    cuiPresence = "all",
    cuiModalite = "",
    cuiAnatomie = "",
    cuiFinding = "",
    referenceFilter = "",
    captionTermGroups = [],
  } = {},
) {
  if (!payload || !Array.isArray(payload.results)) {
    return null;
  }

  const normalizedCaptionFilter = normalizeFilterValue(captionFilter);
  const normalizedCuiFilter = normalizeFilterValue(cuiFilter);
  const normalizedReferenceFilter = normalizeFilterValue(referenceFilter);
  const normalizedCaptionTermGroups = captionTermGroups
    .map((group) => (Array.isArray(group) ? group : [group]))
    .map((group) => group.map((term) => normalizeFilterValue(term)).filter(Boolean))
    .filter((group) => group.length > 0);
  const filteredResults = payload.results
    .filter((result) => result.score >= minScore)
    .filter((result) =>
      normalizeFilterValue(result.caption).includes(normalizedCaptionFilter),
    )
    .filter((result) =>
      normalizedCaptionTermGroups.every((termGroup) => matchesCaptionTermGroup(result.caption, termGroup)),
    )
    .filter((result) => {
      const normalizedCui = getNormalizedResultCui(result);

      if (cuiPresence === "with") {
        return Boolean(normalizedCui);
      }

      if (cuiPresence === "without") {
        return !normalizedCui;
      }

      return true;
    })
    .filter((result) =>
      !normalizedCuiFilter || getNormalizedResultCui(result).includes(normalizedCuiFilter),
    )
    .filter((result) =>
      !cuiModalite || getResultCuiSet(result).has(cuiModalite.toUpperCase()),
    )
    .filter((result) =>
      !cuiAnatomie || getResultCuiSet(result).has(cuiAnatomie.toUpperCase()),
    )
    .filter((result) =>
      !cuiFinding || getResultCuiSet(result).has(cuiFinding.toUpperCase()),
    )
    .filter((result) =>
      !normalizedReferenceFilter || normalizeFilterValue(result.image_id).includes(normalizedReferenceFilter),
    )
    .sort((left, right) =>
      sortOrder === "asc" ? left.score - right.score : right.score - left.score,
    );

  return { ...payload, results: filteredResults };
}

/**
 * Export the current result payload as formatted JSON.
 * @param {object|null} payload
 * @param {string} filename
 */
export function exportResultsAsJson(payload, filename) {
  if (!payload) {
    return;
  }

  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    filename,
  );
}

/**
 * Export visible result rows as a compact CSV file.
 * @param {object|Array|null} payload
 * @param {string} filename
 */
export function exportResultsAsCsv(payload, filename) {
  const rows = getResultRows(payload);
  if (!rows.length) {
    return;
  }

  const headers = ["rank", "image_id", "caption", "path", "score"];
  const csvRows = rows.map((result) =>
    [
      result.rank,
      result.image_id,
      `"${(result.caption || "").replace(/"/g, '""')}"`,
      result.path,
      result.score,
    ].join(","),
  );

  downloadBlob(
    new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv" }),
    filename,
  );
}

/**
 * Export visible result rows as a PDF report with thumbnails when available.
 * @param {object} payload
 * @param {string} filename
 * @param {object} [options]
 * @param {string} [options.title]
 * @returns {Promise<void>}
 */
export async function exportResultsAsPdf(
  payload,
  filename,
  { title = "Search Results" } = {},
) {
  const rows = getResultRows(payload);
  if (!rows.length) {
    return;
  }

  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(16);
  doc.text(title, 10, 10);

  for (let index = 0; index < rows.length; index += 1) {
    const result = rows[index];
    let imageData = null;
    let imageFormat = "JPEG";

    try {
      imageData = await loadImageAsBase64(result.path);
      imageFormat = imageData.startsWith("data:image/png") ? "PNG" : "JPEG";
    } catch {
      imageData = null;
    }

    doc.setFontSize(12);
    doc.text(`Result ${index + 1}`, 10, y);
    y += 6;

    doc.setFontSize(10);
    doc.text(`ID: ${result.image_id}`, 10, y);
    y += 5;
    doc.text(`Score: ${result.score.toFixed(3)}`, 10, y);
    y += 5;

    const captionLines = doc.splitTextToSize(`Caption: ${result.caption || ""}`, 180);
    doc.text(captionLines, 10, y);
    y += captionLines.length * 5;

    if (imageData) {
      doc.addImage(imageData, imageFormat, 10, y, 60, 60);
      y += 65;
    } else {
      y += 5;
    }

    if (y > 260 && index < rows.length - 1) {
      doc.addPage();
      y = 20;
    }
  }

  doc.save(filename);
}
