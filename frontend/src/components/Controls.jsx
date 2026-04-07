import { useContext } from "react";
import { LangContext } from "../context/lang-context";

export default function Controls({
  mode,
  onModeChange,
  k,
  onKChange,
  onSearch,
  disabled,
  showModeToggle = true,
  useHomeVisualTone = false,
  enableToneTransition = false,
}) {
  const { t } = useContext(LangContext);
  const sliderBg = mode === "visual"
    ? "[&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:bg-primary"
    : "[&::-webkit-slider-thumb]:bg-accent [&::-moz-range-thumb]:bg-accent";
  const useHomePrimaryTone = useHomeVisualTone && mode === "visual";
  const useAccentTone = mode === "semantic";
  const modeShellClass = mode === "visual"
    ? useHomePrimaryTone
      ? "image-search-mode-shell image-search-mode-shell-primary"
      : "border-primary/20 bg-primary/10"
    : useAccentTone
      ? "image-search-mode-shell image-search-mode-shell-accent"
      : "border-accent/20 bg-accent/10";

  return (
    <div className={`${enableToneTransition ? "search-tone-transition " : ""}image-search-panel rounded-2xl p-5 shadow-sm flex flex-wrap gap-5 items-end border ${mode === "visual" ? useHomePrimaryTone ? "mediscan-primary-surface" : "bg-primary/5 border-primary/20" : useAccentTone ? "mediscan-accent-surface" : "bg-accent/5 border-accent/20"}`}>
      {/* Mode toggle */}
      {showModeToggle && (
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs text-muted mb-2 font-semibold uppercase tracking-wider">
            {t.search.analysisMode}
          </label>
          <div className={`${enableToneTransition ? "search-tone-transition " : ""}flex rounded-xl overflow-hidden border ${modeShellClass}`}>
            <button
              type="button"
              onClick={() => onModeChange("visual")}
              className={`${enableToneTransition ? "search-tone-transition " : ""}flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer
                ${mode === "visual"
                  ? useHomePrimaryTone
                    ? "mediscan-primary-chip font-semibold"
                    : "bg-primary-pale text-primary font-semibold"
                  : "text-muted hover:text-text hover:bg-white/10"
                }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              </svg>
              {t.search.modeVisual}
            </button>
            <button
              type="button"
              onClick={() => onModeChange("semantic")}
              className={`${enableToneTransition ? "search-tone-transition " : ""}flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 border-l border-border cursor-pointer
                ${mode === "semantic"
                  ? "mediscan-accent-chip font-semibold"
                  : "text-muted hover:text-text hover:bg-white/10"
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
      )}

      {/* K slider */}
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs text-muted mb-2 font-semibold uppercase tracking-wider">
          {t.search.numResults}:{" "}
          <strong className={`text-base font-bold ${mode === "visual" ? useHomePrimaryTone ? "mediscan-primary-text" : "text-primary" : useAccentTone ? "mediscan-accent-text" : "text-accent"}`}>{k}</strong>
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={k}
          onChange={(e) => onKChange(Number(e.target.value))}
          className={`w-full h-1.5 rounded-full ${mode === "visual" ? "bg-primary/20" : "bg-accent/20"} appearance-none
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:shadow-md
            ${sliderBg}
            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:cursor-pointer`}
        />
      </div>

      {/* Search button */}
      <button
        type="button"
        onClick={onSearch}
        disabled={disabled}
        className={`${enableToneTransition ? "search-tone-transition " : ""}py-3 px-8 rounded-xl font-semibold
          flex items-center gap-2 whitespace-nowrap cursor-pointer
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {t.search.search}
      </button>
    </div>
  );
}
