/**
 * @fileoverview Utilitaires de scroll vers la grille de résultats.
 * @module utils/resultsScroll
 */

/**
 * Calcule la position Y cible pour scroller vers la grille de résultats.
 * Tient compte de la hauteur de la navbar selon le breakpoint et du scroll max.
 * @param {HTMLElement} gridNode
 * @param {number} [extraOffset=0] - Décalage supplémentaire en pixels
 * @returns {number}
 */
export function getResultsGridScrollTargetY(gridNode, extraOffset = 0) {
  if (!gridNode || typeof window === "undefined" || typeof document === "undefined") {
    return 0;
  }

  const navOffset = window.innerWidth >= 1024 ? 112 : window.innerWidth >= 768 ? 96 : 84;
  const gridTop = gridNode.getBoundingClientRect().top + window.scrollY;
  const visualAlignmentOffset = 26;
  const targetY = gridTop - navOffset - 12 + visualAlignmentOffset + extraOffset;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

  return Math.max(0, Math.min(targetY, maxScroll));
}

/**
 * Scroll fluide custom via RAF avec easing easeInOutCubic.
 * Retourne une fonction cancel() pour stopper l'animation en cours.
 * @param {number} targetY  - Position Y cible en pixels
 * @param {number} duration - Durée en ms (défaut 1100ms)
 * @param {Function} [onComplete] - Callback appelé à la fin de l'animation
 */
export function smoothScrollTo(targetY, duration = 1100, onComplete) {
  if (typeof window === "undefined") return () => {};

  const startY = window.scrollY;
  const distance = targetY - startY;

  if (Math.abs(distance) < 2) {
    onComplete?.();
    return () => {};
  }

  const startTime = performance.now();
  let rafId = 0;
  let cancelled = false;

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function step(now) {
    if (cancelled) return;
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1);
    window.scrollTo(0, startY + distance * easeInOutCubic(t));
    if (t < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  }

  rafId = requestAnimationFrame(step);

  return function cancel() {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}
