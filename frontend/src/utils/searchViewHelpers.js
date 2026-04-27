/**
 * @fileoverview Shared UI helpers for image and text search workflows.
 * @module utils/searchViewHelpers
 */

import { getResultCuiSet } from "./searchResults";

/**
 * Clear a timer stored in a React ref.
 * @param {{ current: number }} timeoutRef
 */
export function clearTimeoutRef(timeoutRef) {
  window.clearTimeout(timeoutRef.current);
}

/**
 * Resolve the active caption filter ids into full filter definitions.
 * @param {string[]} activeFilterIds
 * @param {Array<{id: string, terms: string[]}>} availableFilters
 * @returns {Array}
 */
export function getSelectedCaptionFilters(activeFilterIds, availableFilters) {
  return activeFilterIds
    .map((filterId) => availableFilters.find((entry) => entry.id === filterId))
    .filter(Boolean);
}

/**
 * Build the available CUI filter groups from the current result rows.
 *
 * Only CUIs present in the results are returned, keeping the filter UI focused
 * on options that can change the visible result set.
 * @param {object[]} rows
 * @param {object} cuiTypes
 * @returns {{ modalite: object[], anatomie: object[], finding: object[] }}
 */
export function buildAvailableCuiByType(rows, cuiTypes) {
  const found = { modalite: new Set(), anatomie: new Set(), finding: new Set() };

  for (const result of rows) {
    const cuis = getResultCuiSet(result);
    for (const [type, entries] of Object.entries(cuiTypes)) {
      if (!(type in found)) {
        continue;
      }

      for (const { cui } of entries) {
        if (cuis.has(cui)) {
          found[type].add(cui);
        }
      }
    }
  }

  return {
    modalite: cuiTypes.modalite.filter(({ cui }) => found.modalite.has(cui)),
    anatomie: cuiTypes.anatomie.filter(({ cui }) => found.anatomie.has(cui)),
    finding: cuiTypes.finding.filter(({ cui }) => found.finding.has(cui)),
  };
}

/**
 * Restart a temporary highlight animation for a guide note.
 * @param {function(boolean): void} setter
 * @param {{ current: number }} timerRef
 */
export function restartNoteHighlight(setter, timerRef) {
  window.clearTimeout(timerRef.current);
  setter(false);

  requestAnimationFrame(() => {
    setter(true);
    timerRef.current = window.setTimeout(() => {
      setter(false);
    }, 2200);
  });
}

/**
 * Return the CSS classes used to highlight guide-note elements by tone.
 * @param {boolean} isHighlighted
 * @param {"primary"|"accent"} [tone="accent"]
 * @returns {{ icon: string, heading: string, chip: string, title: string, copy: string }
 */
export function getGuideHighlightClasses(isHighlighted, tone = "accent") {
  if (!isHighlighted) {
    return {
      icon: "",
      heading: "",
      chip: "",
      title: "",
      copy: "",
    };
  }

  const suffix = tone === "primary" ? "primary" : "accent";

  return {
    icon: `quick-note-icon-glow-${suffix}`,
    heading: `quick-note-heading-glow-${suffix}`,
    chip: `quick-note-chip-glow-${suffix}`,
    title: `quick-note-title-glow-${suffix}`,
    copy: `quick-note-copy-glow-${suffix}`,
  };
}

/**
 * Scroll to an explanatory section and optionally run a completion callback.
 *
 * Respects prefers-reduced-motion by skipping smooth scrolling when users ask
 * the browser to reduce animation.
 * @param {object} params
 * @param {string} params.sectionId
 * @param {string} [params.eyebrowId]
 * @param {object} params.scrollTimerRef
 * @param {function} [params.onComplete]
 */
export function scrollToInfoSection({
  sectionId,
  eyebrowId,
  scrollTimerRef,
  onComplete,
}) {
  const targetSection = document.getElementById(sectionId);
  const targetEyebrow = eyebrowId ? document.getElementById(eyebrowId) : null;

  if (!targetSection) {
    return;
  }

  const targetNode = targetEyebrow || targetSection;
  const targetTop = targetNode.getBoundingClientRect().top + window.scrollY;
  const topOffset = window.innerWidth >= 1024 ? 78 : window.innerWidth >= 768 ? 72 : 66;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const targetY = Math.max(0, Math.min(targetTop - topOffset, maxScroll));

  window.clearTimeout(scrollTimerRef.current);

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    window.scrollTo(0, targetY);
    onComplete?.();
    return;
  }

  window.scrollTo({ top: targetY, behavior: "smooth" });
  scrollTimerRef.current = window.setTimeout(() => {
    scrollTimerRef.current = 0;
    onComplete?.();
  }, 760);
}
