import { BadgePercent, Info, Search, Sparkles, Tags } from "lucide-react";
import { useState, useContext, useEffect, useMemo, useRef } from "react";
import { LangContext } from "../context/LangContext";
import Controls from "./Controls";
import StatusBar from "./StatusBar";
import ResultsGrid from "./ResultsGrid";
import { searchText as apiSearchText } from "../api";
import ClinicalConclusion from "./ClinicalConclusion";
import {
  CURATED_CAPTION_FILTERS,
  exportResultsAsCsv,
  exportResultsAsJson,
  exportResultsAsPdf,
  filterResultsPayload,
  getResultCuiSet,
  getSuggestedCaptionFilters,
} from "../utils/searchResults";
import { getResultsGridScrollTargetY } from "../utils/resultsScroll";
import { CUI_TYPES } from "../data/cuiCategories";

function getFilterToggleStateClasses(isActive) {
  if (isActive) return "mediscan-accent-chip font-semibold shadow-sm";
  return "text-muted hover:bg-accent/8 hover:text-accent";
}

export default function TextSearchView({ onBack, onChromeToneChange }) {
  const { t, lang } = useContext(LangContext);
  const content = t.search.text;
  const filters = t.search.filters;

  const [query, setQuery] = useState("");
  const [k, setK] = useState(5);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // filtres
  const [minScore, setMinScore] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [cuiFilter, setCuiFilter] = useState("");
  const [cuiModalite, setCuiModalite] = useState("");
  const [cuiAnatomie, setCuiAnatomie] = useState("");
  const [cuiFinding, setCuiFinding] = useState("");
  const [referenceFilter, setReferenceFilter] = useState("");
  const [activeCaptionFilterIds, setActiveCaptionFilterIds] = useState([]);

  // UI
  const [filterNoteHighlighted, setFilterNoteHighlighted] = useState(false);
  const [entryAnimationsActive, setEntryAnimationsActive] = useState(true);
  const filterNoteHighlightTimerRef = useRef(null);
  const scrollTimerRef = useRef(0);
  const resultsAutoScrollTimerRef = useRef(0);
  const pendingSearchScrollRef = useRef(false);
  const resultsGridRef = useRef(null);

  useEffect(() => {
    onChromeToneChange?.("accent");
    return () => {
      window.clearTimeout(filterNoteHighlightTimerRef.current);
      window.clearTimeout(scrollTimerRef.current);
      window.clearTimeout(resultsAutoScrollTimerRef.current);
    };
  }, [onChromeToneChange]);

  useEffect(() => {
    const timerId = window.setTimeout(() => setEntryAnimationsActive(false), 1300);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (loading || !results || !pendingSearchScrollRef.current) {
      if (!loading && !results) pendingSearchScrollRef.current = false;
      return undefined;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    let settleTimer = 0;

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        settleTimer = window.setTimeout(() => {
          const gridNode = resultsGridRef.current;
          if (!gridNode) { pendingSearchScrollRef.current = false; return; }

          // Ajuste cet offset pour modifier la position de scroll (positif = plus bas, negatif = plus haut).
          const TEXT_SEARCH_SCROLL_OFFSET = 65;
          const boundedTargetY = getResultsGridScrollTargetY(gridNode, TEXT_SEARCH_SCROLL_OFFSET);
          window.clearTimeout(resultsAutoScrollTimerRef.current);

          if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
            window.scrollTo(0, boundedTargetY);
            pendingSearchScrollRef.current = false;
            return;
          }

          window.scrollTo({ top: boundedTargetY, behavior: "smooth" });
          resultsAutoScrollTimerRef.current = window.setTimeout(() => {
            resultsAutoScrollTimerRef.current = 0;
            pendingSearchScrollRef.current = false;
          }, 760);
        }, 40);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      window.clearTimeout(resultsAutoScrollTimerRef.current);
    };
  }, [loading, results]);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setStatus(null);
    setResults(null);
    resetFilters();
    pendingSearchScrollRef.current = true;

    try {
      const data = await apiSearchText(trimmed, k);
      setResults(data);
      setStatus(null);
    } catch (err) {
      setStatus({ type: "error", message: err.message || content.error });
      pendingSearchScrollRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setMinScore(0);
    setSearchText("");
    setSortOrder("desc");
    setCuiFilter("");
    setCuiModalite("");
    setCuiAnatomie("");
    setCuiFinding("");
    setReferenceFilter("");
    setActiveCaptionFilterIds([]);
  }

  function exportJSON() {
    exportResultsAsJson(filteredResults ?? results, "results_text.json");
  }

  function exportCSV() {
    exportResultsAsCsv(filteredResults ?? results, "results_text.csv");
  }

  async function exportPDF() {
    await exportResultsAsPdf(filteredResults ?? results, "results_text.pdf");
  }

  function restartNoteHighlight(setter, timerRef) {
    window.clearTimeout(timerRef.current);
    setter(false);
    requestAnimationFrame(() => {
      setter(true);
      timerRef.current = window.setTimeout(() => setter(false), 2200);
    });
  }

  function animateScrollTo(targetY, onComplete) {
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

  function scrollToInfoSection(sectionId, eyebrowId, onComplete) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const navOffset = window.innerWidth >= 1024 ? 112 : window.innerWidth >= 768 ? 96 : 84;
    const targetY = Math.max(0, section.getBoundingClientRect().top + window.scrollY - navOffset - 24);
    animateScrollTo(targetY, onComplete);
  }

  function handleFilterInfoClick() {
    scrollToInfoSection(
      "text-search-filter-note",
      "text-search-filter-note-eyebrow",
      () => restartNoteHighlight(setFilterNoteHighlighted, filterNoteHighlightTimerRef),
    );
  }

  function handleCaptionFilterToggle(filterId) {
    setActiveCaptionFilterIds((ids) =>
      ids.includes(filterId) ? ids.filter((id) => id !== filterId) : [...ids, filterId],
    );
  }

  const selectedCaptionFilters = useMemo(
    () => activeCaptionFilterIds
      .map((id) => CURATED_CAPTION_FILTERS.find((e) => e.id === id))
      .filter(Boolean),
    [activeCaptionFilterIds],
  );

  const suggestedCaptionFilters = useMemo(
    () => getSuggestedCaptionFilters(results?.results ?? [], 6),
    [results],
  );

  const filterOptions = {
    minScore,
    captionFilter: searchText,
    sortOrder,
    cuiFilter,
    cuiModalite,
    cuiAnatomie,
    cuiFinding,
    referenceFilter,
    captionTermGroups: selectedCaptionFilters.map((e) => e.terms),
  };

  const filteredResults = useMemo(
    () => filterResultsPayload(results, filterOptions),
    [results, minScore, searchText, sortOrder, cuiFilter, cuiModalite, cuiAnatomie, cuiFinding, referenceFilter, selectedCaptionFilters],
  );
  const displayResults = filteredResults ?? results;

  const availableCuiByType = useMemo(() => {
    const raw = results?.results ?? [];
    const found = { modalite: new Set(), anatomie: new Set(), finding: new Set() };
    for (const result of raw) {
      const cuis = getResultCuiSet(result);
      for (const [type, entries] of Object.entries(CUI_TYPES)) {
        if (!(type in found)) continue;
        for (const { cui } of entries) {
          if (cuis.has(cui)) found[type].add(cui);
        }
      }
    }
    return {
      modalite: CUI_TYPES.modalite.filter(({ cui }) => found.modalite.has(cui)),
      anatomie: CUI_TYPES.anatomie.filter(({ cui }) => found.anatomie.has(cui)),
      finding: CUI_TYPES.finding.filter(({ cui }) => found.finding.has(cui)),
    };
  }, [results]);

  const resultCount = displayResults?.results?.length ?? 0;
  const activeFilterCount = [
    minScore > 0,
    Boolean(searchText.trim()),
    Boolean(cuiFilter.trim()),
    Boolean(referenceFilter.trim()),
    activeCaptionFilterIds.length > 0,
    Boolean(cuiModalite),
    Boolean(cuiAnatomie),
    Boolean(cuiFinding),
    sortOrder !== "desc",
  ].filter(Boolean).length;

  const hasSuggestedCaptionFilters = suggestedCaptionFilters.length > 0;
  const hasResults = Boolean(results);
  const lockedResultsStageHeightClass = "lg:h-[54.5rem]";
  const uploadEntryClass = entryAnimationsActive ? "by-image-panel-enter-left" : "";
  const controlsEntryClass = entryAnimationsActive ? "by-image-panel-enter-down" : "";
  const launchEntryClass = entryAnimationsActive ? "by-image-panel-enter-up" : "";
  const detailChips = query.trim()
    ? [
        { id: "mode", label: content.quickNoteChip },
        { id: "count", label: `${t.search.numResults}: ${k}` },
        { id: "action", label: t.search.search },
      ]
    : [
        { id: "mode", label: content.quickNoteChip },
        { id: "count", label: `${t.search.numResults}: ${k}` },
        { id: "lang", label: content.langNote },
      ];

  return (
    <div className="search-workspace search-workspace-text search-workspace-accent search-semantic-theme bg-transparent">

      {/* Header */}
      <section className="max-w-[1400px] mx-auto px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className="search-workspace-back inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-sm font-medium text-muted hover:text-accent hover:border-accent/30 transition-all shadow-sm hover:shadow mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {content.back}
        </button>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-title mb-3">
            {content.headline}
          </h1>
          <span className="mediscan-accent-chip inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {content.badge}
          </span>
        </div>
      </section>

      {/* Search Interface */}
      <div className="max-w-[1400px] mx-auto px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">

          {/* Left — Panneau 1 : textarea (sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className={`image-search-panel mediscan-accent-surface rounded-2xl border shadow-sm backdrop-blur-sm p-5 flex flex-col lg:h-[29.25rem] ${uploadEntryClass}`}>
                <div className="mb-3">
                  <span className="mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    {content.step1}
                  </span>
                </div>
                <p className="text-sm text-muted mb-3">{content.step1Desc}</p>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                  {content.label}{" "}
                  <span className="normal-case font-normal">({content.langNote})</span>
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSearch();
                  }}
                  placeholder={content.placeholder}
                  maxLength={500}
                  className="search-workspace-field flex-1 w-full px-3 py-2.5 rounded-xl border border-border bg-transparent text-text placeholder:text-muted text-sm resize-none focus:outline-none focus:border-accent transition-all"
                />
                <div className="flex justify-end mt-1">
                  <span className="text-[11px] text-muted">{query.length}/500</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Panneaux 2 et 3 */}
          <div className="lg:col-span-2">

            {/* Panneau 2 : Controls */}
            <div className={`image-search-panel mediscan-accent-surface rounded-2xl border shadow-sm backdrop-blur-sm p-5 flex flex-col lg:h-[14rem] mb-5 ${controlsEntryClass}`}>
              <div className="mb-3">
                <span className="mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {content.step2}
                </span>
              </div>
              <div className="mt-auto">
                <Controls
                  mode="semantic"
                  onModeChange={() => {}}
                  k={k}
                  onKChange={setK}
                  onSearch={handleSearch}
                  disabled={!query.trim() || loading}
                  loading={loading}
                  showModeToggle={false}
                />
              </div>
            </div>

            <StatusBar status={status?.type === "error" ? status : null} tone="accent" />

            {/* Panneau 3 : Info panel — toujours visible */}
            {!loading && (
              <div className={`image-search-panel mediscan-accent-surface rounded-2xl p-6 md:p-7 border shadow-sm flex flex-col justify-between text-left lg:h-[14rem] ${launchEntryClass}`}>
                <div>
                  <span className="mediscan-accent-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    {query.trim() ? content.pendingStep : content.readyStep}
                  </span>
                  {query.trim() ? (
                    <div className="mt-4 flex items-start gap-3">
                      <div className="mediscan-accent-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                        <Search className="w-4.5 h-4.5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-[1.35rem] font-bold mediscan-accent-text">{content.pendingTitle}</h3>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{content.pendingDescription}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-start gap-3">
                      <div className="mediscan-accent-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                        <Search className="w-4.5 h-4.5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className="text-xl md:text-[1.35rem] font-bold mediscan-accent-text">{content.readyTitle}</h3>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{content.readyDescription}</p>
                      </div>
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {detailChips.map((chip) => (
                      <span
                        key={chip.id}
                        className="mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="image-search-panel mediscan-accent-surface rounded-2xl p-10 border shadow-sm flex items-center justify-center lg:h-[14rem]">
                <span className="inline-block h-8 w-8 rounded-full border-2 border-accent/25 border-t-accent animate-spin" />
              </div>
            )}
          </div>

          {/* Results + Filters */}
          {hasResults && (
            <div className="lg:col-span-3">
              <div ref={resultsGridRef} className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,0.88fr)_minmax(0,2.12fr)] lg:items-start lg:gap-6">

                {/* Filter sidebar */}
                <div className="lg:self-start">
                  <div className="image-search-panel mediscan-results-stage-enter mediscan-accent-surface rounded-2xl border p-5 shadow-sm backdrop-blur-sm lg:flex lg:flex-col overflow-y-auto" style={{ maxHeight: "calc(100vh - 7rem)" }}>

                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-title">
                            {filters.title}
                          </h3>
                          <button
                            type="button"
                            onClick={handleFilterInfoClick}
                            className="inline-flex h-5.5 w-5.5 items-center justify-center rounded-md text-muted transition-all hover:bg-accent/6 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                            aria-label={filters.infoLabel}
                            title={filters.infoLabel}
                          >
                            <Info className="h-4 w-4" strokeWidth={2} />
                          </button>
                          {activeFilterCount > 0 && (
                            <span className="mediscan-accent-chip inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold">
                              {activeFilterCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted">{filters.refineHint}</p>
                      </div>
                      <button
                        type="button"
                        onClick={resetFilters}
                        disabled={activeFilterCount === 0}
                        className={`search-toolbar-button rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${activeFilterCount > 0 ? "cursor-pointer mediscan-accent-outline-button" : "cursor-not-allowed opacity-45 border-border bg-bg text-muted"}`}
                      >
                        {filters.reset}
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                        {content.step3}
                      </span>
                      <span className="text-sm font-semibold text-title">
                        {resultCount} {resultCount === 1 ? t.search.results.resultsFoundSingular : t.search.results.resultsFoundPlural}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">

                      {/* Caption */}
                      <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                        <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                          {filters.caption}
                        </label>
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          placeholder={filters.captionPlaceholder}
                          className="search-workspace-field mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                        />
                        {hasSuggestedCaptionFilters && (
                          <div className="mt-2.5">
                            <p className="text-[10px] text-muted font-medium uppercase tracking-wider mb-1.5">
                              {filters.quickTerms}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {suggestedCaptionFilters.map((entry) => {
                                const isActive = activeCaptionFilterIds.includes(entry.id);
                                return (
                                  <button
                                    key={entry.id}
                                    type="button"
                                    onClick={() => handleCaptionFilterToggle(entry.id)}
                                    className={`search-mode-option inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium transition-all ${getFilterToggleStateClasses(isActive)}`}
                                  >
                                    <span>{entry.label}</span>
                                    <span className="opacity-70">{entry.count}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CUI code + 3 selects */}
                      <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                        <div>
                          <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                            {filters.cui}
                          </label>
                          <input
                            type="text"
                            value={cuiFilter}
                            onChange={(e) => setCuiFilter(e.target.value)}
                            placeholder={filters.cuiPlaceholder}
                            className="search-workspace-field mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {[
                            [filters.cuiModalite, cuiModalite, setCuiModalite, availableCuiByType.modalite],
                            [filters.cuiAnatomie, cuiAnatomie, setCuiAnatomie, availableCuiByType.anatomie],
                            [filters.cuiFinding, cuiFinding, setCuiFinding, availableCuiByType.finding],
                          ].map(([label, value, setter, options]) => (
                            <div key={label}>
                              <label className="block text-[10px] text-muted/70 font-medium uppercase tracking-wider truncate">
                                {label}
                              </label>
                              <div className="relative mt-1">
                                <select
                                  value={value}
                                  onChange={(e) => setter(e.target.value)}
                                  disabled={options.length === 0}
                                  className="search-workspace-field w-full appearance-none rounded-lg border border-border bg-bg px-2 py-2 pr-6 text-xs text-text focus:outline-none focus:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <option value="">—</option>
                                  {options.map(({ cui, label_fr, label_en }) => (
                                    <option key={cui} value={cui}>
                                      {lang === "fr" ? label_fr : label_en}
                                    </option>
                                  ))}
                                </select>
                                <svg
                                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted"
                                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Score min */}
                      <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                        <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                          {filters.minScore}
                        </label>
                        <div className="mt-2.5 flex items-center gap-3">
                          <input
                            type="range" min="0" max="1" step="0.01"
                            value={minScore}
                            onChange={(e) => setMinScore(Number(e.target.value))}
                            className="search-slider-track search-slider-track-accent h-1.5 w-full rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                          />
                          <span className="min-w-[2.8rem] text-right text-sm font-bold mediscan-accent-text">
                            {Math.round(minScore * 100)}%
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
                          <span>0%</span><span>100%</span>
                        </div>
                      </div>

                      {/* Référence */}
                      <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                        <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                          {filters.reference}
                        </label>
                        <input
                          type="text"
                          value={referenceFilter}
                          onChange={(e) => setReferenceFilter(e.target.value)}
                          placeholder={filters.referencePlaceholder}
                          className="search-workspace-field mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent"
                        />
                      </div>

                      {/* Tri */}
                      <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                        <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">
                          {filters.sort}
                        </label>
                        <div className="image-search-mode-shell image-search-mode-shell-accent mt-1.5 flex gap-1 rounded-xl border p-1">
                          {[["desc", filters.sortDesc], ["asc", filters.sortAsc]].map(([value, label]) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setSortOrder(value)}
                              className={`search-mode-option flex-1 rounded-[0.8rem] border border-transparent px-3 py-2 text-xs font-medium transition-all ${getFilterToggleStateClasses(sortOrder === value)}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Results grid */}
                <div className="min-w-0">
                  <ResultsGrid
                    data={displayResults}
                    className="mt-0"
                    headerHiddenOnDesktop
                    animateOnMount
                    desktopLockedHeightClass={lockedResultsStageHeightClass}
                    onExportJson={exportJSON}
                    onExportCsv={exportCSV}
                    onExportPdf={exportPDF}
                  />
                  <ClinicalConclusion searchResult={results} isAccent={true} className="mt-6" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter guide */}
      <section id="text-search-filter-note" className="max-w-[1400px] mx-auto px-4 pb-14 sm:px-6">
        <div className="border-t border-border/70 pt-7">
          <div className="max-w-3xl">
            <p
              id="text-search-filter-note-eyebrow"
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-muted ${filterNoteHighlighted ? "quick-note-heading-glow-accent" : ""}`}
            >
              {filters.guide.eyebrow}
            </p>
            <h2 className="mt-4 text-xl font-bold text-title md:text-2xl">
              {filters.guide.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {filters.guide.description}
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              [Tags, filters.guide.caption],
              [BadgePercent, filters.guide.score],
              [Sparkles, filters.guide.order],
            ].map(([Icon, section]) => (
              <article key={section.label} className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/18 bg-accent-pale text-accent ${filterNoteHighlighted ? "quick-note-icon-glow-accent" : ""}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className={`flex flex-wrap items-center gap-2 ${filterNoteHighlighted ? "quick-note-heading-glow-accent" : ""}`}>
                    <span className={`mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${filterNoteHighlighted ? "quick-note-chip-glow-accent" : ""}`}>
                      {section.label}
                    </span>
                    <h3 className={`text-base font-bold text-title ${filterNoteHighlighted ? "quick-note-title-glow-accent" : ""}`}>
                      {section.title}
                    </h3>
                  </div>
                  <p className="mediscan-accent-text mt-3 text-sm leading-7">{section.description}</p>
                  <p className="mt-2 text-xs leading-6 text-muted">{section.note}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
