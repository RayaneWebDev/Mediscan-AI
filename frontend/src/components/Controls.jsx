import { useContext } from "react";
import { LangContext } from "../context/lang-context";

export default function Controls({ mode, onModeChange, k, onKChange, onSearch, disabled, showModeToggle = true }) {
  const { t } = useContext(LangContext);
  const sliderBg = mode === "visual"
    ? "[&::-webkit-slider-thumb]:bg-primary [&::-moz-range-thumb]:bg-primary"
    : "[&::-webkit-slider-thumb]:bg-accent [&::-moz-range-thumb]:bg-accent";

  return (
    <div className={`rounded-2xl p-5 shadow-sm flex flex-wrap gap-5 items-end transition-all ${mode === "visual" ? "bg-primary/5 border border-primary/20" : "bg-accent/5 border border-accent/20"}`}>
      {/* Mode toggle */}
      {showModeToggle && (
        <div className="flex-1 min-w-[220px]">
          <label className="block text-xs text-muted mb-2 font-semibold uppercase tracking-wider">
            Analysis Mode
          </label>
          <div className="flex rounded-xl overflow-hidden border border-border bg-bg">
            <button
              onClick={() => onModeChange("visual")}
              className={`flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer
                ${mode === "visual"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted hover:text-text hover:bg-border/50"
                }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" />
              </svg>
              {t.search.modeVisual}
            </button>
            <button
              onClick={() => onModeChange("semantic")}
              className={`flex-1 py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-all border-l border-border cursor-pointer
                ${mode === "semantic"
                  ? "bg-accent text-white shadow-sm"
                  : "text-muted hover:text-text hover:bg-border/50"
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
          <strong className={`text-base font-bold ${mode === "visual" ? "text-primary" : "text-accent"}`}>{k}</strong>
        </label>
        <input
          type="range"
          min="1"
          max="50"
          value={k}
          onChange={(e) => onKChange(Number(e.target.value))}
          className={`w-full h-1.5 rounded-full ${mode === "visual" ? "bg-primary/30" : "bg-accent/30"} appearance-none
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
        onClick={onSearch}
        disabled={disabled}
        className={`py-3 px-8 rounded-xl text-white font-semibold
          flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer shadow-sm
          hover:shadow-md hover:-translate-y-0.5
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
          ${mode === "visual"
            ? "bg-gradient-to-r from-primary to-primary-light"
            : "bg-gradient-to-r from-accent to-accent-light"
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
