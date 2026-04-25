/**
 * @fileoverview Palettes de couleurs et utilitaires d'application des variables CSS.
 * @module data/palettes
 */

/** Clé de stockage de la palette sélectionnée dans localStorage */
export const PALETTE_STORAGE_KEY = "mediscan-palette";
/** Identifiant de la palette par défaut */
export const DEFAULT_PALETTE_ID = "classic";

/** Palettes disponibles avec leurs tokens light/dark */
export const COLOR_PALETTES = {
  classic: {
    label: "Classic",
    light: {
      title: "#1e293b",
      text: "#1e293b",
      muted: "#64748b",
      primary: "#1d4ed8",
      "primary-soft": "#eff6ff",
      accent: "#0891b2",
      "accent-soft": "#ecfeff",
      surface: "rgba(255, 255, 255, 0.9)",
      bg: "#f8fafc",
      "bg-soft": "#eef6ff",
      border: "#d9e4f1",
      footer: "#0f172a",
      "footer-muted": "#94a3b8",
      danger: "#ef4444",
      "on-strong": "#ffffff",
    },
    dark: {
      title: "#e8f1f7",
      text: "#d8e6ee",
      muted: "#91a6b5",
      primary: "#6fa7dc",
      "primary-soft": "#10283f",
      accent: "#7ccfe3",
      "accent-soft": "#102f3a",
      surface: "rgba(13, 24, 34, 0.9)",
      bg: "#061018",
      "bg-soft": "#0b1a24",
      border: "#1e3442",
      footer: "#030a10",
      "footer-muted": "#839aa8",
      danger: "#f37b7b",
      "on-strong": "#f6fbfb",
    },
  },
  mineral: {
    label: "Mineral",
    light: {
      title: "#24313f",
      text: "#24313f",
      muted: "#667689",
      primary: "#1f5cb8",
      "primary-soft": "#eef5ff",
      accent: "#0f8f7a",
      "accent-soft": "#ebfbf7",
      surface: "rgba(255, 255, 255, 0.9)",
      bg: "#f7fafb",
      "bg-soft": "#eef5f7",
      border: "#d7e2e6",
      footer: "#14202d",
      "footer-muted": "#93a5b5",
      danger: "#e45656",
      "on-strong": "#ffffff",
    },
    dark: {
      title: "#e2ebf3",
      text: "#e2ebf3",
      muted: "#9baebf",
      primary: "#78a9f2",
      "primary-soft": "#13243e",
      accent: "#48d5bf",
      "accent-soft": "#082622",
      surface: "rgba(13, 22, 36, 0.84)",
      bg: "#071018",
      "bg-soft": "#0d1824",
      border: "#223445",
      footer: "#040a12",
      "footer-muted": "#7f97a9",
      danger: "#f07a7a",
      "on-strong": "#f8fbff",
    },
  },
  slate: {
    label: "Slate",
    light: {
      title: "#253042",
      text: "#253042",
      muted: "#6a7284",
      primary: "#335ccf",
      "primary-soft": "#f0f4ff",
      accent: "#2f7b91",
      "accent-soft": "#edf7fa",
      surface: "rgba(255, 255, 255, 0.9)",
      bg: "#f8f9fc",
      "bg-soft": "#eef2f8",
      border: "#d8deea",
      footer: "#151a24",
      "footer-muted": "#98a2b3",
      danger: "#e35d5d",
      "on-strong": "#ffffff",
    },
    dark: {
      title: "#e1e8f3",
      text: "#e1e8f3",
      muted: "#a1acbe",
      primary: "#89a6ff",
      "primary-soft": "#172341",
      accent: "#67c0d2",
      "accent-soft": "#0b2230",
      surface: "rgba(16, 21, 33, 0.84)",
      bg: "#090d16",
      "bg-soft": "#111827",
      border: "#283244",
      footer: "#04060d",
      "footer-muted": "#8592a7",
      danger: "#f17b7b",
      "on-strong": "#f9fbff",
    },
  },
  "custom-test": {
    label: "Custom Test",
    light: {
      title: "#1e293b",
      text: "#1e293b",
      muted: "#7d838d",
      primary: "#1e7f8b",
      "primary-soft": "#d1e4e8",
      accent: "#2d9b7c",
      "accent-soft": "#d2e8df",
      surface: "rgba(255, 255, 255, 0.9)",
      bg: "#f7fbfa",
      "bg-soft": "#ecf5f4",
      border: "#dbdde0",
      footer: "#101829",
      "footer-muted": "#8a9099",
      danger: "#e45656",
      "on-strong": "#f8fbff",
    },
    dark: {
      title: "#dddfe2",
      text: "#dddfe2",
      muted: "#b5b8be",
      primary: "#1e7f8b",
      "primary-soft": "#10343b",
      accent: "#2d9b7c",
      "accent-soft": "#12392e",
      surface: "rgba(17, 25, 35, 0.84)",
      bg: "#0b0f17",
      "bg-soft": "#10282b",
      border: "#1b2535",
      footer: "#060c1d",
      "footer-muted": "#989da5",
      danger: "#f07a7a",
      "on-strong": "#f8fbff",
    },
  },
  "clinical-tech": {
    label: "Clinical Tech",
    light: {
      title: "#1e293b",
      text: "#1e293b",
      muted: "#64748b",
      primary: "#0f4eb8",
      "primary-soft": "#8ba4d8",
      accent: "#0b7f67",
      "accent-soft": "#8fb9ae",
      surface: "rgba(255, 255, 255, 0.9)",
      bg: "#f8fafc",
      "bg-soft": "#eef6ff",
      border: "#d9e4f1",
      footer: "#0f172a",
      "footer-muted": "#94a3b8",
      danger: "#ef4444",
      "on-strong": "#ffffff",
    },
    dark: {
      title: "#e5eef9",
      text: "#e5eef9",
      muted: "#9cb0ca",
      primary: "#2e72e4",
      "primary-soft": "#0d1c35",
      accent: "#0f9b7e",
      "accent-soft": "#0b211d",
      surface: "rgba(15, 23, 42, 0.82)",
      bg: "#060d19",
      "bg-soft": "#0d1728",
      border: "#243347",
      footer: "#030712",
      "footer-muted": "#7f93b2",
      danger: "#f87171",
      "on-strong": "#f8fbff",
    },
  },
};

/**
 * Vérifie si une valeur est un identifiant de palette valide.
 * @param {*} value
 * @returns {boolean}
 */
export function isPaletteId(value) {
  return typeof value === "string" && Object.hasOwn(COLOR_PALETTES, value);
}

/**
 * Retourne les tokens de couleur d'une palette pour un thème donné.
 * Fallback sur "light" si le thème n'existe pas.
 * @param {"light"|"dark"} theme
 * @param {string} [paletteId=DEFAULT_PALETTE_ID]
 * @returns {object}
 */
export function getPalette(theme, paletteId = DEFAULT_PALETTE_ID) {
  const resolvedId = isPaletteId(paletteId) ? paletteId : DEFAULT_PALETTE_ID;
  const palette = COLOR_PALETTES[resolvedId];
  return palette[theme] ?? palette.light;
}

/**
 * Applique les tokens d'une palette comme variables CSS sur un élément racine.
 * @param {HTMLElement} root
 * @param {"light"|"dark"} theme
 * @param {string} paletteId
 */
export function applyPaletteVariables(root, theme, paletteId) {
  const palette = getPalette(theme, paletteId);

  Object.entries(palette).forEach(([token, value]) => {
    root.style.setProperty(`--palette-${token}`, value);
  });
}
