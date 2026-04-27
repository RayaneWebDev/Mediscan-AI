/**
 * @fileoverview Shared search controls for mode selection, k depth, and guarded launch actions.
 * @module components/Controls
 */

import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LangContext } from "../context/LangContextValue";

/**
 * Render the shared search control panel.
 *
 * The panel owns the k slider, the optional visual/semantic mode toggle, the
 * launch button, and the confirmation popover used before discarding results.
 *
 *
 * @component
 * @param {object} props
 * @param {"visual"|"semantic"} props.mode
 * @param {function(string, object): string|void} props.onModeChange
 * @param {number} props.k
 * @param {function(number): void} props.onKChange
 * @param {function(): void} props.onSearch
 * @param {boolean} props.disabled
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.showModeToggle=true]
 * @param {boolean} [props.useHomeVisualTone=false]
 * @param {boolean} [props.enableToneTransition=false]
 * @param {boolean} [props.modeToggleDisabled=false]
 * @param {boolean} [props.modeChangeGuardActive=false]
 * @param {string} [props.modeChangeConfirmMessage=""]
 * @param {string} [props.modeChangeConfirmActionLabel=""]
 * @param {string} [props.modeChangeCancelLabel=""]
 * @param {function(): void} [props.onModeInfoClick=null]
 * @param {string} [props.modeInfoLabel=""]
 * @param {boolean} [props.modeInfoHighlighted=false]
 * @returns {JSX.Element}
 *
 */
export default function Controls({
  mode,
  onModeChange,
  k,
  onKChange,
  onSearch,
  disabled,
  loading = false,
  showModeToggle = true,
  useHomeVisualTone = false,
  enableToneTransition = false,
  modeToggleDisabled = false,
  modeChangeGuardActive = false,
  modeChangeConfirmMessage = "",
  modeChangeConfirmActionLabel = "",
  modeChangeCancelLabel = "",
  onModeInfoClick = null,
  modeInfoLabel = "",
  modeInfoHighlighted = false,
}) {
  const { t } = useContext(LangContext);

  /** Mode waiting for confirmation through the popover. */
  const [pendingMode, setPendingMode] = useState(null);
  /** CSS position applied to the confirmation popover. */
  const [popoverStyle, setPopoverStyle] = useState(null);
  const useHomePrimaryTone = useHomeVisualTone && mode === "visual";
  const useAccentTone = mode === "semantic";
  const toneSyncClass = enableToneTransition ? "search-tone-sync" : "";
  const sliderToneClass = mode === "visual" ? "search-slider-track-primary" : "search-slider-track-accent";
  /** Reference to the mode toggle used to position the popover.*/
  const modeToggleRef = useRef(null);
  /** Reference to the popover used to detect outside clicks. */
  const popoverRef = useRef(null);

  const panelSurfaceClass = mode === "visual"
    ? useHomePrimaryTone ? "mediscan-primary-surface" : "bg-primary/5 border-primary/20"
    : useAccentTone ? "mediscan-accent-surface" : "bg-accent/5 border-accent/20";
  const modeConfirmPopoverClass = useHomePrimaryTone
    ? "search-mode-confirm-popover search-mode-confirm-popover-primary"
    : useAccentTone
      ? "search-mode-confirm-popover search-mode-confirm-popover-accent"
      : "search-mode-confirm-popover";
  const modeConfirmCancelClass = useHomePrimaryTone
    ? "search-mode-confirm-button-secondary-primary"
    : useAccentTone
      ? "search-mode-confirm-button-secondary-accent"
      : "";
  const modeConfirmActionClass = useHomePrimaryTone
    ? "search-mode-confirm-button-primary"
    : mode === "semantic"
      ? "search-mode-confirm-button-accent"
      : "mediscan-accent-chip";

  const modeShellClass = mode === "visual"
    ? useHomePrimaryTone
      ? "image-search-mode-shell image-search-mode-shell-primary"
      : "border-primary/20 bg-primary/10"
    : useAccentTone
      ? "image-search-mode-shell image-search-mode-shell-accent"
      : "border-accent/20 bg-accent/10";
  const activeModeClass = modeToggleDisabled ? "cursor-not-allowed" : "cursor-pointer";
  const visualInactiveClass = modeToggleDisabled
    ? "cursor-not-allowed text-muted/75"
    : "cursor-pointer text-muted hover:bg-primary/8 hover:text-primary";
  const semanticInactiveClass = modeToggleDisabled
    ? "cursor-not-allowed text-muted/75"
    : "cursor-pointer text-muted hover:bg-accent/8 hover:text-accent";
  const effectivePendingMode =
    modeChangeGuardActive && pendingMode && pendingMode !== mode
      ? pendingMode
      : null;

  // Close the popover when the user clicks outside it.
  useEffect(() => {
    if (!effectivePendingMode) return undefined;

    /**
     * Dismiss the pending mode when pointer input happens outside the popover.
     * @param {MouseEvent|TouchEvent} event
     */
    const handlePointerDown = (event) => {
      const target = event.target;
      if (popoverRef.current?.contains(target) || modeToggleRef.current?.contains(target)) {
        return;
      }

      setPendingMode(null);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [effectivePendingMode]);

  // Dynamically compute the popover position on resize and scroll.
  useLayoutEffect(() => {
    if (!effectivePendingMode || !modeToggleRef.current || typeof window === "undefined") {
      return undefined;
    }

    /**
     * Keep the floating confirmation popover aligned with the mode toggle.
     */
    const updatePopoverPosition = () => {
      const rect = modeToggleRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportWidth = window.innerWidth;
      const desiredWidth = Math.min(384, viewportWidth - 32);
      const width = Math.max(260, desiredWidth);
      const left = Math.min(
        Math.max(16, rect.left),
        Math.max(16, viewportWidth - width - 16),
      );

      setPopoverStyle({
        top: rect.bottom + 10,
        left,
        width,
      });
    };

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [effectivePendingMode]);

  /**
   * Attempt to change the search mode, optionally asking the parent for confirmation.
   *
   * @param {"visual"|"semantic"} nextMode
   * @param {object} [options={}]
   * @param {boolean} [options.force]
  */
  function handleModeAttempt(nextMode, options = {}) {
    const { force = false } = options;

    if (nextMode === mode) {
      setPendingMode(null);
      return;
    }

    if (modeToggleDisabled) return;

    const result = onModeChange(nextMode, { force });

    if (result === "confirm" && !force) {
      setPendingMode(nextMode);
      return;
    }

    setPendingMode(null);
  }

  /**
   * Confirm a guarded mode change and force the parent to clear existing results.
   */
  function handleConfirmModeChange() {
    if (!effectivePendingMode) return;
    handleModeAttempt(effectivePendingMode, { force: true });
  }

  return (
    <div className={`${enableToneTransition ? "search-tone-transition " : ""}search-controls-panel image-search-panel rounded-2xl p-5 shadow-sm flex flex-wrap gap-4 items-stretch sm:items-end border ${panelSurfaceClass}`}>
      {/* Mode toggle */}
      {showModeToggle && (
        <div className="flex-1 min-w-[220px]">
          <div className="mb-2 flex items-center gap-2">
            <label className={`${toneSyncClass} block text-xs font-semibold uppercase tracking-wider text-muted`}>
              {t.search.analysisMode}
            </label>
            {onModeInfoClick && (
              <button
                type="button"
                onClick={onModeInfoClick}
                className={`${enableToneTransition ? "search-tone-transition " : ""}info-trigger analysis-mode-info-trigger ${mode === "semantic" ? "info-trigger-accent" : "info-trigger-primary"} inline-flex h-5.5 w-5.5 items-center justify-center ${modeInfoHighlighted ? mode === "semantic" ? "info-trigger-glow-accent" : "info-trigger-glow-primary" : ""} focus:outline-none focus:ring-2 ${mode === "semantic" ? "focus:ring-accent/25" : "focus:ring-primary/25"}`}
                aria-label={modeInfoLabel || t.search.analysisMode}
                title={modeInfoLabel || t.search.analysisMode}
              >
                <span aria-hidden="true" className="text-sm font-medium leading-none">i</span>
              </button>
            )}
          </div>
          <div ref={modeToggleRef}>
            <div className={`${enableToneTransition ? "search-tone-transition " : ""}search-mode-shell flex gap-1 rounded-xl border p-1 ${modeShellClass}`}>
            <button
              type="button"
              onClick={() => handleModeAttempt("visual")}
              aria-disabled={modeToggleDisabled}
              className={`${enableToneTransition ? "search-tone-transition " : ""}search-mode-option flex-1 rounded-[0.8rem] border border-transparent py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer
                ${mode === "visual"
                  ? useHomePrimaryTone
                    ? `mediscan-primary-chip search-mode-option-selected font-semibold shadow-sm ${activeModeClass}`
                    : `bg-primary-pale text-primary search-mode-option-selected font-semibold shadow-sm ${activeModeClass}`
                  : visualInactiveClass
                }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              </svg>
              {t.search.modeVisual}
            </button>
            <button
              type="button"
              onClick={() => handleModeAttempt("semantic")}
              aria-disabled={modeToggleDisabled}
              className={`${enableToneTransition ? "search-tone-transition " : ""}search-mode-option flex-1 rounded-[0.8rem] border border-transparent py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer
                ${mode === "semantic"
                  ? `mediscan-accent-chip search-mode-option-selected font-semibold shadow-sm ${activeModeClass}`
                  : semanticInactiveClass
                }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
              {t.search.modeSemantic}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* K slider */}
      <div className="flex-1 min-w-[200px]">
        <label className={`${toneSyncClass} block text-xs text-muted mb-2 font-semibold uppercase tracking-wider`}>
          {t.search.numResults}:{" "}
          <strong className={`${toneSyncClass} text-base font-bold ${mode === "visual" ? useHomePrimaryTone ? "mediscan-primary-text" : "text-primary" : useAccentTone ? "mediscan-accent-text" : "text-accent"}`}>{k}</strong>
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={k}
          onChange={(e) => onKChange(Number(e.target.value))}
          className={`${toneSyncClass} search-slider-track ${sliderToneClass} w-full h-1.5 rounded-full appearance-none
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer`}
        />
      </div>

      {/* Search button */}
      <button
        type="button"
        onClick={onSearch}
        disabled={disabled}
        className={`${enableToneTransition ? "search-tone-transition " : ""}search-action-button h-11 w-full min-w-0 px-4 rounded-xl font-semibold
          inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer sm:h-12 sm:w-auto sm:min-w-[9.75rem] sm:px-8
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
          ${mode === "visual"
            ? useHomePrimaryTone
              ? "mediscan-primary-action"
              : "button-solid-primary"
            : useAccentTone
              ? "mediscan-accent-action"
              : "button-solid-accent"
          }`}
      >
        {loading ? (
          <>
            <span className="inline-block h-[1.05rem] w-[1.05rem] shrink-0 rounded-full border-2 border-current/25 border-t-current animate-spin" />
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {t.search.search}
          </>
        )}
      </button>

      {/* Popover de confirmation de changement de mode */}
      {effectivePendingMode && modeChangeConfirmMessage && popoverStyle && typeof document !== "undefined" && createPortal(
        <div
          className="fixed z-[120]"
          style={{
            top: `${popoverStyle.top}px`,
            left: `${popoverStyle.left}px`,
            width: `${popoverStyle.width}px`,
          }}
        >
          <div
            ref={popoverRef}
            className={`rounded-2xl border border-border/80 bg-surface/95 p-3 shadow-xl backdrop-blur-sm ${modeConfirmPopoverClass}`}
          >
            <p className="search-mode-confirm-copy text-xs font-medium leading-5 text-muted">
              {modeChangeConfirmMessage}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingMode(null)}
                className={`inline-flex items-center rounded-full border border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted transition-colors hover:border-primary/20 hover:text-text ${modeConfirmCancelClass}`}
              >
                {modeChangeCancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirmModeChange}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${modeConfirmActionClass}`}
              >
                {modeChangeConfirmActionLabel}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
