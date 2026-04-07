import { useContext, useState } from "react";
import { imageUrl } from "../api";
import { LangContext } from "../context/lang-context";

function ScoreBar({ score, tone }) {
  const pct = Math.round(score * 100);
  const color = tone === "accent"
    ? (pct >= 70 ? "bg-accent/70" : pct >= 40 ? "bg-accent/35" : "bg-border")
    : (pct >= 70 ? "bg-primary/70" : pct >= 40 ? "bg-primary/35" : "bg-border");
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Score</span>
        <span className="text-xs font-bold text-text">{pct}%</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ResultCard({ result, onRelaunch, selected, onToggleSelect, tone, useHomeVisualTone = false, relaunchLabel }) {
  const c = tone === "accent" ? {
    shell: "mediscan-accent-surface",
    selected: "mediscan-accent-selected",
    rank: "border mediscan-accent-chip",
    checkbox: "border mediscan-accent-chip",
    checkboxHover: "hover:border-accent/30",
    relaunch: "mediscan-accent-outline-button",
  } : {
    shell: useHomeVisualTone ? "mediscan-primary-surface" : "",
    selected: useHomeVisualTone ? "mediscan-primary-selected" : "border-primary/50 ring-1 ring-primary/20",
    rank: useHomeVisualTone ? "border mediscan-primary-chip" : "bg-primary-pale text-primary",
    checkbox: useHomeVisualTone ? "border mediscan-primary-chip" : "bg-primary-pale border-primary/50",
    checkboxHover: useHomeVisualTone ? "hover:border-primary/30" : "hover:border-primary/50",
    relaunch: useHomeVisualTone ? "mediscan-primary-outline-button" : "border-primary/30 text-primary hover:bg-primary-pale",
  };

  return (
    <div className={`bg-surface border rounded-2xl overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 group backdrop-blur-sm ${c.shell} ${selected ? c.selected : "border-border"}`}>
      <div className="bg-bg border-b border-border relative">
        <img
          src={imageUrl(result.image_id)}
          alt={result.image_id}
          loading="lazy"
          className="w-full aspect-square object-contain"
        />
        <span className={`absolute top-2 left-2 ${c.rank} text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm`}>
          #{result.rank}
        </span>
        {onToggleSelect && (
          <button
            type="button"
            onClick={() => onToggleSelect(result.image_id)}
            className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow ${selected ? `${c.checkbox}` : `bg-surface border-border ${c.checkboxHover}`}`}
          >
            {selected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        )}
      </div>
      <div className="p-3.5">
        <p className="text-text text-xs leading-relaxed line-clamp-3">{result.caption}</p>
        <p className="text-muted text-[10px] mt-1.5 font-mono truncate">{result.image_id}</p>
        <ScoreBar score={result.score} tone={tone} />
        {onRelaunch && (
          <button
            type="button"
            onClick={() => onRelaunch(result.image_id)}
            className={`mt-3 w-full text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${c.relaunch}`}
          >
            {relaunchLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ResultsGrid({ data, useHomeVisualTone = false }) {
  const { t } = useContext(LangContext);
  const content = t.search.results;
  const [selectedIds, setSelectedIds] = useState([]);

  if (!data) return null;

  const isVisual = data.mode === "visual";
  const tone = isVisual ? "primary" : "accent";
  const useHomePrimaryTone = useHomeVisualTone && isVisual;

  const modeLabel = isVisual
    ? content.visualMode
    : data.mode === "text"
      ? content.textMode
      : content.semanticMode;
  const modeColor = isVisual
    ? useHomePrimaryTone ? "border mediscan-primary-chip" : "bg-primary-pale text-primary border-primary/20"
    : "border mediscan-accent-chip";

  const selectionBg = isVisual
    ? useHomePrimaryTone ? "mediscan-primary-surface" : "bg-primary-pale border-primary/20"
    : "mediscan-accent-surface";
  const selectionText = isVisual ? useHomePrimaryTone ? "mediscan-primary-text" : "text-primary" : "mediscan-accent-text";
  const selectionBtnBorder = isVisual
    ? useHomePrimaryTone ? "mediscan-primary-outline-button" : "border-primary/30 text-primary hover:bg-primary/10"
    : "mediscan-accent-outline-button";
  const selectionBtnPrimary = isVisual
    ? useHomePrimaryTone ? "mediscan-primary-action" : "button-solid-primary"
    : "mediscan-accent-action";

  function handleToggleSelect(imageId) {
    setSelectedIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  }

  function handleRelaunchMultiple() {
    if (selectedIds.length >= 2 && data.onRelaunchMultiple) {
      data.onRelaunchMultiple(selectedIds);
      setSelectedIds([]);
    }
  }

  return (
    <section className="mt-8">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-bold text-title">
          {data.results.length}{" "}
          {data.results.length > 1 ? content.resultsFoundPlural : content.resultsFoundSingular}
        </h2>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${modeColor}`}>
          {modeLabel}
        </span>
      </div>

      {selectedIds.length >= 2 && (
        <div className={`mb-4 p-3 border rounded-xl flex items-center justify-between gap-3 ${selectionBg}`}>
          <span className={`text-sm font-medium ${selectionText}`}>
            {selectedIds.length} {content.selectedCount}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${selectionBtnBorder}`}
            >
              {content.clearSelection}
            </button>
            <button
              type="button"
              onClick={handleRelaunchMultiple}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${selectionBtnPrimary}`}
            >
              {content.relaunchSelection}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {data.results.map((r) => (
          <ResultCard
            key={r.image_id}
            result={r}
            onRelaunch={data.onRelaunch}
            selected={selectedIds.includes(r.image_id)}
            onToggleSelect={handleToggleSelect}
            tone={tone}
            useHomeVisualTone={useHomePrimaryTone}
            relaunchLabel={content.relaunchImage}
          />
        ))}
      </div>
    </section>
  );
}
