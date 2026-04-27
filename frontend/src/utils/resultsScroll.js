/**
 * @fileoverview Scroll-position helpers shared by search result views.
 * @module utils/resultsScroll
 */

/**
 * Account for navbar height by breakpoint and maximum scroll range.
 *
 * The result panels are rendered below sticky navigation, so scroll targets need
 * to be bounded and offset rather than using raw element positions.
 * @param {HTMLElement} gridNode
 * @param {number} [extraOffset=0]
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
 * Run a cancellable smooth scroll using requestAnimationFrame.
 *
 * This is used when native smooth scrolling is not precise enough for the result
 * panels, especially after cards finish entering the layout.
 * @param {number} targetY
 * @param {number} duration
 * @param {Function} [onComplete]
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

  /**
   * Easing curve used by the custom scroll animation.
   * @param {number} t
   * @returns {number}
   */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Advance one animation frame for the custom scroll.
   * @param {number} now - Timestamp provided by requestAnimationFrame.
   */
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
