/** 
 * @fileoverview Vue de recherche par texte (mode sémantique/interprétif).
 * @module components/TextSearchView
 */

import { BadgePercent, Info, Search, Sparkles, Tags } from "lucide-react";
import { useState, useContext, useEffect, useMemo, useRef, useCallback } from "react";
import { LangContext } from "../context/LangContextValue";
import Controls from "./Controls";
import StatusBar from "./StatusBar";
import ResultsGrid from "./ResultsGrid";
import {
  SearchCaptionFilterCard,
  SearchCuiFilterCard,
  SearchFilterPanelHeader,
  SearchReferenceFilterCard,
  SearchScoreFilterCard,
  SearchSortFilterCard,
} from "./SearchFilterSections";
import { SearchGuideCard, SearchGuideSectionHeader } from "./SearchGuideSections";
import { searchText as apiSearchText } from "../api";
import ClinicalConclusion from "./ClinicalConclusion";
import {
  CURATED_CAPTION_FILTERS,
  exportResultsAsCsv,
  exportResultsAsJson,
  exportResultsAsPdf,
  filterResultsPayload,
  getSuggestedCaptionFilters,
} from "../utils/searchResults";
import { getResultsGridScrollTargetY } from "../utils/resultsScroll";
import {
  buildAvailableCuiByType,
  clearTimeoutRef,
  getGuideHighlightClasses,
  getSelectedCaptionFilters,
  restartNoteHighlight,
  scrollToInfoSection,
} from "../utils/searchViewHelpers";
import { CUI_TYPES } from "../data/cuiCategories";

// Ajuste cette valeur selon le rendu souhaite: negatif = moins bas, positif = plus bas.
const TEXT_SEARCH_SCROLL_OFFSET = 60;
const TEXT_SEARCH_SCROLL_MAX_RETRIES = 4;
const TEXT_SEARCH_SCROLL_RETRY_DELAY_MS = 160;
const TEXT_SEARCH_SCROLL_TOLERANCE = 6;

/**
 * Retourne les classes CSS actives/inactives d'un bouton de filtre toggle.
 * @param {boolean} isActive
 * @returns {string}
 */
function getFilterToggleStateClasses(isActive) {
  if (isActive) return "mediscan-accent-chip font-semibold shadow-sm";
  return "text-muted hover:bg-accent/8 hover:text-accent";
}

/**
 * Vue de recherche CBIR par description textuelle.
 * Gère la saisie de requête, le déclenchement de la recherche,
 * les filtres de résultats et le scroll automatique vers les résultats.
 *
 * @component
 * @param {object} props
 * @param {function(): void} props.onBack - Retour vers le hub de recherche
 * @param {function(string): void} props.onChromeToneChange - Callback de changement de ton du chrome
 * @returns {JSX.Element}
 */
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
  const [quickNoteHighlighted, setQuickNoteHighlighted] = useState(false);
  const [filterNoteHighlighted, setFilterNoteHighlighted] = useState(false);
  const [entryAnimationsActive, setEntryAnimationsActive] = useState(true);
  const quickNoteHighlightTimerRef = useRef(null);
  const filterNoteHighlightTimerRef = useRef(null);
  const scrollTimerRef = useRef(0);
  const scrollRetryTimerRef = useRef(0);
  const scrollCancelRef = useRef(null);
  const pendingSearchScrollRef = useRef(false);
  const resultsAnchorRef = useRef(null);
  const resultsStageRef = useRef(null);
  const resultsGridRef = useRef(null);
  const hasSearchResults = Boolean(results);
  const resultCount = results?.results?.length ?? 0;

  /** Annule le scroll automatique en cours vers les résultats. */
  const cancelSearchAutoScroll = useCallback(() => {
    window.clearTimeout(scrollRetryTimerRef.current);
    scrollRetryTimerRef.current = 0;
    scrollCancelRef.current?.();
    scrollCancelRef.current = null;
  }, []);

  /**
 * Tente un scroll automatique vers la zone de résultats après une recherche.
 * Se relance jusqu'à TEXT_SEARCH_SCROLL_MAX_RETRIES fois si la cible n'est pas atteinte.
 * @param {number} [attempt=0] - Numéro de la tentative courante
 */
  const runSearchAutoScrollAttempt = useCallback((attempt = 0) => {
    const targetNode = resultsStageRef.current || resultsAnchorRef.current;
    if (!targetNode || typeof window === "undefined") {
      pendingSearchScrollRef.current = false;
      return;
    }

    const targetY = getResultsGridScrollTargetY(targetNode, TEXT_SEARCH_SCROLL_OFFSET);

    const finalizeAttempt = () => {
      scrollCancelRef.current = null;

      const latestTargetNode = resultsStageRef.current || resultsAnchorRef.current;
      if (!latestTargetNode || typeof window === "undefined") {
        pendingSearchScrollRef.current = false;
        return;
      }

      const latestTargetY = getResultsGridScrollTargetY(latestTargetNode, TEXT_SEARCH_SCROLL_OFFSET);
      const remainingDelta = Math.abs(window.scrollY - latestTargetY);

      if (remainingDelta <= TEXT_SEARCH_SCROLL_TOLERANCE || attempt >= TEXT_SEARCH_SCROLL_MAX_RETRIES) {
        pendingSearchScrollRef.current = false;
        return;
      }

      scrollRetryTimerRef.current = window.setTimeout(() => {
        scrollRetryTimerRef.current = 0;
        runSearchAutoScrollAttempt(attempt + 1);
      }, TEXT_SEARCH_SCROLL_RETRY_DELAY_MS);
    };

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      window.scrollTo(0, targetY);
      finalizeAttempt();
      return;
    }

    window.scrollTo({ top: targetY, behavior: "smooth" });
    const settleDelay = attempt === 0 ? 760 : 460;
    const settleTimer = window.setTimeout(finalizeAttempt, settleDelay);
    scrollCancelRef.current = () => {
      window.clearTimeout(settleTimer);
    };
  }, []);

  useEffect(() => {
    onChromeToneChange?.("accent");
    return () => {
      clearTimeoutRef(quickNoteHighlightTimerRef);
      clearTimeoutRef(filterNoteHighlightTimerRef);
      clearTimeoutRef(scrollTimerRef);
      cancelSearchAutoScroll();
    };
  }, [cancelSearchAutoScroll, onChromeToneChange]);

  useEffect(() => {
    const timerId = window.setTimeout(() => setEntryAnimationsActive(false), 1300);
    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    if (loading || !hasSearchResults || !pendingSearchScrollRef.current) {
      if (!loading && !hasSearchResults) {
        pendingSearchScrollRef.current = false;
      }
      return undefined;
    }

    let firstFrame = 0;
    let secondFrame = 0;
    let settleTimer = 0;

    firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        settleTimer = window.setTimeout(() => {
          const targetNode = resultsStageRef.current || resultsAnchorRef.current;
          if (!targetNode || typeof window === "undefined") {
            pendingSearchScrollRef.current = false;
            return;
          }

          if (resultsGridRef.current) {
            resultsGridRef.current.scrollTop = 0;
          }
          cancelSearchAutoScroll();
          runSearchAutoScrollAttempt(0);
        }, 100);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      cancelSearchAutoScroll();
    };
  }, [cancelSearchAutoScroll, hasSearchResults, loading, resultCount, runSearchAutoScrollAttempt]);

  /**
  * Déclenche une recherche sémantique avec la requête courante.
  * Applique un délai minimum pour éviter un flash de l'interface.
  */
  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    cancelSearchAutoScroll();
    if (resultsGridRef.current) {
      resultsGridRef.current.scrollTop = 0;
    }
    setLoading(true);
    setStatus(null);
    resetFilters();
    pendingSearchScrollRef.current = true;

    const minDelay = new Promise((resolve) => window.setTimeout(resolve, 700));

    try {
      const [data] = await Promise.all([apiSearchText(trimmed, k), minDelay]);
      setResults(data);
      setStatus(null);
    } catch (err) {
      setStatus({ type: "error", message: err.message || content.error });
      pendingSearchScrollRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  /**
  * Réinitialise tous les filtres à leur valeur par défaut.
  */
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

  /**
  * Exporte les résultats filtrés (ou bruts) en JSON.
  */
  function exportJSON() {
    exportResultsAsJson(filteredResults ?? results, "results_text.json");
  }

  /**
  * Exporte les résultats filtrés (ou bruts) en CSV.
  */
  function exportCSV() {
    exportResultsAsCsv(filteredResults ?? results, "results_text.csv");
  }

  /**
  * Exporte les résultats filtrés (ou bruts) en PDF.
  */
  async function exportPDF() {
    await exportResultsAsPdf(filteredResults ?? results, "results_text.pdf");
  }

  /**
  * Scrolle vers la section guide des filtres et déclenche son highlight.
  */
  function handleFilterInfoClick() {
    scrollToInfoSection({
      sectionId: "text-search-filters-note",
      eyebrowId: "text-search-filters-note-eyebrow",
      scrollTimerRef,
      onComplete: () => restartNoteHighlight(setFilterNoteHighlighted, filterNoteHighlightTimerRef),
    });

    window.clearTimeout(quickNoteHighlightTimerRef.current);
    setQuickNoteHighlighted(false);
    window.clearTimeout(filterNoteHighlightTimerRef.current);
    setFilterNoteHighlighted(false);
  }

  /**
  * Scrolle vers la section guide du mode interprétif et déclenche son highlight.
  */
  function handleModeInfoClick() {
    scrollToInfoSection({
      sectionId: "text-search-quick-note",
      eyebrowId: "text-search-quick-note-eyebrow",
      scrollTimerRef,
      onComplete: () => restartNoteHighlight(setQuickNoteHighlighted, quickNoteHighlightTimerRef),
    });
  }
  
  /**
  * Active ou désactive un filtre de caption par son identifiant.
  * @param {string} filterId
  */
  function handleCaptionFilterToggle(filterId) {
    setActiveCaptionFilterIds((ids) =>
      ids.includes(filterId) ? ids.filter((id) => id !== filterId) : [...ids, filterId],
    );
  }

  const selectedCaptionFilters = useMemo(
    () => getSelectedCaptionFilters(activeCaptionFilterIds, CURATED_CAPTION_FILTERS),
    [activeCaptionFilterIds],
  );

  const suggestedCaptionFilters = useMemo(
    () => getSuggestedCaptionFilters(results?.results ?? [], 6),
    [results],
  );

  const filterOptions = useMemo(
    () => ({
      minScore,
      captionFilter: searchText,
      sortOrder,
      cuiFilter,
      cuiModalite,
      cuiAnatomie,
      cuiFinding,
      referenceFilter,
      captionTermGroups: selectedCaptionFilters.map((e) => e.terms),
    }),
    [minScore, searchText, sortOrder, cuiFilter, cuiModalite, cuiAnatomie, cuiFinding, referenceFilter, selectedCaptionFilters],
  );

  const filteredResults = useMemo(
    () => filterResultsPayload(results, filterOptions),
    [results, filterOptions],
  );
  const displayResults = filteredResults ?? results;

  const availableCuiByType = useMemo(() => {
    return buildAvailableCuiByType(results?.results ?? [], CUI_TYPES);
  }, [results]);

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
  const cuiSelectGroups = [
    { label: filters.cuiModalite, value: cuiModalite, onChange: setCuiModalite, options: availableCuiByType.modalite },
    { label: filters.cuiAnatomie, value: cuiAnatomie, onChange: setCuiAnatomie, options: availableCuiByType.anatomie },
    { label: filters.cuiFinding, value: cuiFinding, onChange: setCuiFinding, options: availableCuiByType.finding },
  ];
  const sortOptions = [
    { value: "desc", label: filters.sortDesc },
    { value: "asc", label: filters.sortAsc },
  ];

  const hasSuggestedCaptionFilters = suggestedCaptionFilters.length > 0;
  const hasResults = Boolean(results);
  const uploadEntryClass = entryAnimationsActive ? "by-image-panel-enter-left" : "";
  const controlsEntryClass = entryAnimationsActive ? "by-image-panel-enter-down" : "";
  const launchEntryClass = entryAnimationsActive ? "by-image-panel-enter-up" : "";
  const infoEntryClass = entryAnimationsActive ? "by-image-panel-enter-up" : "";
  const infoStepLabel = query.trim() ? content.pendingStep : content.readyStep;
  const infoTitle = query.trim() ? content.pendingTitle : content.readyTitle;
  const infoDescription = query.trim() ? content.pendingDescription : content.readyDescription;
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
  const filterPanelTitleClassName = "text-sm font-bold uppercase tracking-[0.18em] text-title";
  const filterPanelInfoButtonClassName = `info-trigger info-trigger-accent inline-flex h-5.5 w-5.5 items-center justify-center ${filterNoteHighlighted ? "info-trigger-glow-accent" : ""} focus:outline-none focus:ring-2 focus:ring-accent/25`;
  const filterPanelHintClassName = "mt-1 text-xs leading-5 text-muted";
  const filterPanelResetButtonClassName = `search-toolbar-button rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${activeFilterCount > 0 ? "cursor-pointer mediscan-accent-outline-button" : "cursor-not-allowed opacity-45 border-border bg-bg text-muted"}`;
  const filterLabelClassName = "text-[10px] text-muted font-semibold uppercase tracking-wider";
  const filterInputClassName = "search-workspace-field w-full rounded-xl border border-border bg-bg py-2.5 px-3 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent";
  const filterSelectLabelClassName = "block text-[10px] text-muted/70 font-medium uppercase tracking-wider truncate";
  const filterSelectClassName = "search-workspace-field w-full appearance-none rounded-lg border border-border bg-bg px-2 py-2 pr-6 text-xs text-text focus:outline-none focus:border-accent disabled:opacity-40 disabled:cursor-not-allowed";
  const filterScoreSliderClassName = "search-slider-track search-slider-track-accent h-1.5 w-full rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer";
  const filterScoreValueClassName = "search-filter-score-value-accent min-w-[2.8rem] text-right text-sm font-bold mediscan-accent-text";
  const filterScoreScaleClassName = "mt-2 flex items-center justify-between text-[11px] text-muted";
  const filterSortShellClassName = "image-search-mode-shell image-search-mode-shell-accent mt-1.5 flex gap-1 rounded-xl border p-1";
  const getCaptionFilterButtonClassName = (isActive) =>
    `search-mode-option inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium transition-all ${getFilterToggleStateClasses(isActive)}`;
  const getSortOptionClassName = (_value, isActive) =>
    `search-mode-option flex-1 rounded-[0.8rem] border border-transparent px-3 py-2 text-xs font-medium transition-all ${getFilterToggleStateClasses(isActive)}`;
  const quickGuideHighlightClasses = getGuideHighlightClasses(quickNoteHighlighted, "accent");
  const filterGuideHighlightClasses = getGuideHighlightClasses(filterNoteHighlighted, "accent");
  const legendCards = [
    {
      id: "interpretive",
      icon: <Search className="h-4.5 w-4.5" />,
      iconWrapperClassName: `text-search-legend-interpretive-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${quickGuideHighlightClasses.icon}`,
      label: content.legend.interpretive.label,
      title: content.legend.interpretive.title,
      description: content.legend.interpretive.description,
      note: content.legend.interpretive.note,
      headingClassName: `flex flex-wrap items-center gap-2 ${quickGuideHighlightClasses.heading}`,
      chipClassName: `text-search-legend-interpretive-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${quickGuideHighlightClasses.chip}`,
      titleClassName: `text-base font-bold text-title ${quickGuideHighlightClasses.title}`,
      descriptionClassName: `mt-3 text-sm leading-7 text-muted ${quickGuideHighlightClasses.copy}`,
      noteClassName: `mt-2 text-xs leading-6 text-muted ${quickGuideHighlightClasses.copy}`,
    },
    {
      id: "writing",
      icon: <Info className="h-4.5 w-4.5" />,
      iconWrapperClassName: `text-search-legend-writing-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${quickGuideHighlightClasses.icon}`,
      label: content.legend.writing.label,
      title: content.legend.writing.title,
      description: content.legend.writing.description,
      note: content.legend.writing.note,
      headingClassName: `flex flex-wrap items-center gap-2 ${quickGuideHighlightClasses.heading}`,
      chipClassName: `text-search-legend-writing-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${quickGuideHighlightClasses.chip}`,
      titleClassName: `text-base font-bold text-title ${quickGuideHighlightClasses.title}`,
      descriptionClassName: `mt-3 text-sm leading-7 text-muted ${quickGuideHighlightClasses.copy}`,
      noteClassName: `mt-2 text-xs leading-6 text-muted ${quickGuideHighlightClasses.copy}`,
    },
  ];
  const filterGuideCards = [
    {
      id: "caption",
      icon: <Tags className="h-4.5 w-4.5" />,
      iconWrapperClassName: `search-filter-guide-badge-icon search-filter-guide-caption-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${filterGuideHighlightClasses.icon}`,
      chipClassName: `search-filter-guide-badge-chip search-filter-guide-caption-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${filterGuideHighlightClasses.chip}`,
      label: filters.guide.caption.label,
      title: filters.guide.caption.title,
      description: filters.guide.caption.description,
      note: filters.guide.caption.note,
    },
    {
      id: "score",
      icon: <BadgePercent className="h-4.5 w-4.5" />,
      iconWrapperClassName: `search-filter-guide-badge-icon search-filter-guide-score-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${filterGuideHighlightClasses.icon}`,
      chipClassName: `search-filter-guide-badge-chip search-filter-guide-score-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${filterGuideHighlightClasses.chip}`,
      label: filters.guide.score.label,
      title: filters.guide.score.title,
      description: filters.guide.score.description,
      note: filters.guide.score.note,
    },
    {
      id: "order",
      icon: <Sparkles className="h-4.5 w-4.5" />,
      iconWrapperClassName: `search-filter-guide-badge-icon search-filter-guide-combination-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${filterGuideHighlightClasses.icon}`,
      chipClassName: `search-filter-guide-badge-chip search-filter-guide-combination-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${filterGuideHighlightClasses.chip}`,
      label: filters.guide.order.label,
      title: filters.guide.order.title,
      description: filters.guide.order.description,
      note: filters.guide.order.note,
    },
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
          <span className="text-search-header-badge image-search-step-badge-accent mediscan-accent-chip inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {content.badge}
          </span>
          <button
            type="button"
            onClick={handleModeInfoClick}
            className={`ml-2 info-trigger info-trigger-accent inline-flex h-5.5 w-5.5 -translate-y-0.5 items-center justify-center text-sm font-medium ${quickNoteHighlighted ? "info-trigger-glow-accent" : ""} focus:outline-none focus:ring-2 focus:ring-accent/25`}
            aria-label={content.modeInfoLabel}
            title={content.modeInfoLabel}
          >
            i
          </button>
        </div>
      </section>

      {/* Search Interface */}
      <div className="max-w-[1400px] mx-auto px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">

          {/* Left — Panneau 1 : textarea (sticky) */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className={`image-search-panel image-search-visual-stage-panel mediscan-accent-surface rounded-2xl border shadow-sm backdrop-blur-sm p-5 flex flex-col lg:h-[29.25rem] ${uploadEntryClass}`}>
                <div className="mb-3">
                  <span className="image-search-step-badge-accent mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    {content.step1}
                  </span>
                </div>
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
            <div className={`image-search-panel image-search-controls-stage-panel mediscan-accent-surface rounded-2xl border shadow-sm backdrop-blur-sm p-5 flex flex-col lg:h-[14rem] mb-5 ${controlsEntryClass}`}>
              <div className="mb-3">
                <span className="image-search-step-badge-accent mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
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

            {/* Panneau 3 : Info panel — stable pendant la recherche */}
            <div className={`image-search-panel image-search-visual-stage-panel mediscan-accent-surface rounded-2xl p-6 md:p-7 border shadow-sm flex flex-col justify-between text-left lg:h-[14rem] ${launchEntryClass}`}>
              <div>
                <span className="image-search-step-badge-accent mediscan-accent-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {infoStepLabel}
                </span>
                <div className="mt-4 flex items-start gap-3">
                  <div className="mediscan-accent-chip text-search-detail-icon-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                    {loading ? (
                      <span className="inline-block h-4.5 w-4.5 rounded-full border-2 border-current/25 border-t-current animate-spin" />
                    ) : (
                      <Search className="w-4.5 h-4.5" strokeWidth={1.8} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl md:text-[1.35rem] font-bold mediscan-accent-text">{infoTitle}</h3>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted">{infoDescription}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {detailChips.map((chip) => (
                    <span
                      key={chip.id}
                      className="image-search-step-badge-accent mediscan-accent-chip text-search-detail-chip-accent inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results + Filters */}
          <div
            ref={resultsAnchorRef}
            className="lg:col-span-3 h-0"
            aria-hidden="true"
            style={{ overflowAnchor: "none" }}
          />

          {hasResults && (
            <div className="lg:col-span-3">
              <div
                ref={resultsStageRef}
                className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,0.88fr)_minmax(0,2.12fr)] lg:items-start lg:gap-6"
                style={{ overflowAnchor: "none" }}
              >

                {/* Filter sidebar */}
                <div className="lg:self-start">
                  <div
                    className="image-search-panel image-search-filter-stage-panel mediscan-accent-surface rounded-2xl border p-5 shadow-sm backdrop-blur-sm"
                  >
                    <SearchFilterPanelHeader
                      title={filters.title}
                      titleClassName={filterPanelTitleClassName}
                      infoLabel={filters.infoLabel}
                      onInfoClick={handleFilterInfoClick}
                      infoButtonClassName={filterPanelInfoButtonClassName}
                      hint={filters.refineHint}
                      hintClassName={filterPanelHintClassName}
                      onReset={resetFilters}
                      resetDisabled={activeFilterCount === 0}
                      resetLabel={filters.reset}
                      resetButtonClassName={filterPanelResetButtonClassName}
                    />

                    <div className="mt-4 flex items-center gap-2">
                      <span className="image-search-step-badge-accent mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                        {content.step3}
                      </span>
                      <span className="text-sm font-semibold text-title">
                        {resultCount} {resultCount === 1 ? t.search.results.resultsFoundSingular : t.search.results.resultsFoundPlural}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      <SearchCaptionFilterCard
                        label={filters.caption}
                        labelClassName={filterLabelClassName}
                        value={searchText}
                        onChange={setSearchText}
                        placeholder={filters.captionPlaceholder}
                        inputWrapperClassName="mt-1.5"
                        inputClassName={filterInputClassName}
                        suggestedFilters={hasSuggestedCaptionFilters ? suggestedCaptionFilters : []}
                        activeFilterIds={activeCaptionFilterIds}
                        onToggleFilter={handleCaptionFilterToggle}
                        getToggleClassName={getCaptionFilterButtonClassName}
                        quickTermsLabel={filters.quickTerms}
                        quickTermsLabelClassName="mb-1.5 text-[10px] text-muted font-medium uppercase tracking-wider"
                        quickTermsListClassName="flex flex-wrap gap-1.5"
                      />

                      <SearchCuiFilterCard
                        label={filters.cui}
                        labelClassName={filterLabelClassName}
                        value={cuiFilter}
                        onChange={setCuiFilter}
                        placeholder={filters.cuiPlaceholder}
                        inputClassName={`${filterInputClassName} mt-1.5`}
                        selectGroups={cuiSelectGroups}
                        selectLabelClassName={filterSelectLabelClassName}
                        selectClassName={filterSelectClassName}
                        lang={lang}
                      />

                      <SearchScoreFilterCard
                        label={filters.minScore}
                        labelClassName={filterLabelClassName}
                        value={minScore}
                        onChange={setMinScore}
                        sliderClassName={filterScoreSliderClassName}
                        scoreClassName={filterScoreValueClassName}
                        scaleClassName={filterScoreScaleClassName}
                      />

                      <SearchReferenceFilterCard
                        label={filters.reference}
                        labelClassName={filterLabelClassName}
                        value={referenceFilter}
                        onChange={setReferenceFilter}
                        placeholder={filters.referencePlaceholder}
                        inputClassName={`${filterInputClassName} mt-1.5`}
                      />

                      <SearchSortFilterCard
                        label={filters.sort}
                        labelClassName={filterLabelClassName}
                        shellClassName={filterSortShellClassName}
                        options={sortOptions}
                        currentValue={sortOrder}
                        onChange={setSortOrder}
                        getOptionClassName={getSortOptionClassName}
                      />

                    </div>
                  </div>
                </div>

                {/* Results grid */}
                <div className="min-w-0">
                  <ResultsGrid
                    data={displayResults}
                    className="mt-0"
                    headerHiddenOnDesktop
                    animateOnMount={false}
                    cardsGridExternalRef={resultsGridRef}
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

      <section
        id="text-search-quick-note"
        className="text-search-guide-fixed-interpretive scroll-mt-28 max-w-[1400px] mx-auto px-4 pb-28 sm:px-6 lg:pb-36"
      >
        <div className={`${infoEntryClass} text-search-guide-divider border-t border-border/70 pt-7`}>
          <SearchGuideSectionHeader
            eyebrowId="text-search-quick-note-eyebrow"
            eyebrow={content.legendEyebrow}
            title={content.legendTitle}
            description={content.legendDescription}
            eyebrowClassName="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted"
            titleClassName="mt-4 text-xl font-bold text-title md:text-2xl"
            descriptionClassName="mt-2 max-w-2xl text-sm leading-7 text-muted"
          />

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {legendCards.map((card) => (
              <SearchGuideCard
                key={card.id}
                icon={card.icon}
                iconWrapperClassName={card.iconWrapperClassName}
                label={card.label}
                title={card.title}
                description={card.description}
                note={card.note}
                headingClassName={card.headingClassName}
                chipClassName={card.chipClassName}
                titleClassName={card.titleClassName}
                descriptionClassName={card.descriptionClassName}
                noteClassName={card.noteClassName}
              />
            ))}
          </div>

          <div
            id="text-search-filters-note"
            className="text-search-guide-divider mt-10 border-t border-border/70 pt-7"
          >
            <SearchGuideSectionHeader
              eyebrowId="text-search-filters-note-eyebrow"
              eyebrow={filters.guide.eyebrow}
              title={filters.guide.title}
              description={filters.guide.description}
              eyebrowClassName={`text-[11px] font-semibold uppercase tracking-[0.18em] text-muted ${filterGuideHighlightClasses.heading}`}
              titleClassName={`mt-4 text-xl font-bold text-title md:text-2xl ${filterGuideHighlightClasses.title}`}
              descriptionClassName={`mt-2 max-w-2xl text-sm leading-7 text-muted ${filterGuideHighlightClasses.copy}`}
            />

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {filterGuideCards.map((card) => (
                <SearchGuideCard
                  key={card.id}
                  icon={card.icon}
                  label={card.label}
                  title={card.title}
                  description={card.description}
                  note={card.note}
                  articleClassName="flex h-full items-stretch gap-4 self-stretch"
                  iconWrapperClassName={card.iconWrapperClassName}
                  contentClassName="grid min-h-full min-w-0 flex-1 grid-rows-[auto_1fr_auto]"
                  headingClassName={`flex flex-wrap items-center gap-2 ${filterGuideHighlightClasses.heading}`}
                  chipClassName={card.chipClassName}
                  titleClassName={`text-base font-bold text-title ${filterGuideHighlightClasses.title}`}
                  descriptionClassName={`mt-3 text-sm leading-7 text-muted ${filterGuideHighlightClasses.copy}`}
                  noteClassName={`self-end pt-2 text-xs leading-6 text-muted ${filterGuideHighlightClasses.copy}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
