import { BadgePercent, Search, Sparkles, Tags, X } from "lucide-react";
import { useState, useContext, useEffect, useMemo, useRef } from "react";
import { LangContext } from "../context/LangContextValue";
import UploadZone from "./UploadZone";
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
import { searchImage, searchById, searchByIds, imageUrl } from "../api";
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
import { VisualModeIcon, InterpretiveModeIcon } from "./icons";
import { CUI_TYPES } from "../data/cuiCategories";

function runCleanupRef(cleanupRef) {
  cleanupRef.current?.();
}

function StepBadge({ label, isAccent, useHomeVisualTone, enableToneTransition = false }) {
  const toneClass = isAccent
    ? "mediscan-accent-chip image-search-step-badge-accent"
    : useHomeVisualTone
      ? "mediscan-primary-chip image-search-step-badge-primary"
      : "border-primary/20 bg-primary-pale text-primary";
  return (
    <span className={`${enableToneTransition ? "search-tone-sync " : ""}inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClass}`}>
      {label}
    </span>
  );
}

function getFilterToggleStateClasses(isActive, isAccent, useHomeVisualTone) {
  if (isActive) {
    if (isAccent) {
      return "mediscan-accent-chip font-semibold shadow-sm";
    }

    if (useHomeVisualTone) {
      return "mediscan-primary-chip font-semibold shadow-sm";
    }

    return "border border-primary/20 bg-primary-pale text-primary font-semibold shadow-sm";
  }

  return isAccent
    ? "text-muted hover:bg-accent/8 hover:text-accent"
    : "text-muted hover:bg-primary/8 hover:text-primary";
}

export default function ImageSearchView({ onBack, onChromeToneChange }) {
  const { t, lang } = useContext(LangContext);
  const content = t.search;
  const filters = t.search.filters;
  const resultsContent = t.search.results;

  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("visual");
  const [k, setK] = useState(5);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [visualResults, setVisualResults] = useState(null);
  const [semanticResults, setSemanticResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // filtres
  const [minScore, setMinScore] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [cuiFilter, setCuiFilter] = useState("");
  const [cuiPresence, setCuiPresence] = useState("all");
  const [cuiModalite, setCuiModalite] = useState("");
  const [cuiAnatomie, setCuiAnatomie] = useState("");
  const [cuiFinding, setCuiFinding] = useState("");
  const [activeCaptionFilterIds, setActiveCaptionFilterIds] = useState([]);
  const [sortOrder, setSortOrder] = useState("desc");
  const [compareMode] = useState(false);
  const [toneTransitionReady, setToneTransitionReady] = useState(false);
  const [entryAnimationsActive, setEntryAnimationsActive] = useState(true);
  const [quickNoteHighlighted, setQuickNoteHighlighted] = useState(false);
  const [filterNoteHighlighted, setFilterNoteHighlighted] = useState(false);
  const [filterOrderOnlyHighlighted, setFilterOrderOnlyHighlighted] = useState(false);
  const [selectionCardOpen, setSelectionCardOpen] = useState(false);
  const queryPreviewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const quickNoteHighlightTimerRef = useRef(null);
  const filterNoteHighlightTimerRef = useRef(null);
  const quickNoteScrollTimerRef = useRef(0);
  const scrollCancelRef = useRef(null);
  const resultsCardsGridRef = useRef(null);
  const pendingSearchScrollRef = useRef(false);
  const [referenceFilter, setReferenceFilter] = useState("");

  useEffect(() => {
    return () => {
      if (queryPreviewUrl) {
        URL.revokeObjectURL(queryPreviewUrl);
      }
    };
  }, [queryPreviewUrl]);

  useEffect(() => {
    return () => {
      clearTimeoutRef(quickNoteHighlightTimerRef);
      clearTimeoutRef(filterNoteHighlightTimerRef);
      clearTimeoutRef(quickNoteScrollTimerRef);
      runCleanupRef(scrollCancelRef);
    };
  }, []);

  function handleFileSelect(f) {
    if (!f.type.match(/^image\/(jpeg|png)$/)) {
      setStatus({
        type: "error",
        message: content.image.invalidFileType,
      });
      return;
    }
    setFile(f);
    setStatus(null);
    clearResults();
  }

  function handleRemove() {
    setFile(null);
    clearResults();
    setStatus(null);
  }

  function attachCallbacks(data) {
    return { ...data, onRelaunch: handleRelaunch, onRelaunchMultiple: handleRelaunchMultiple };
  }

  function clearResults() {
    setResults(null);
    setVisualResults(null);
    setSemanticResults(null);
    setSelectedIds([]);
  }

  async function runSearch(action, { clearExistingResults = true } = {}) {
    setLoading(true);
    setStatus(null);
    if (clearExistingResults) {
      clearResults();
    }

    const minDelay = new Promise((resolve) => window.setTimeout(resolve, 700));

    try {
      await Promise.all([action(), minDelay]);
      setStatus(null);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || content.error,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!file) return;

    pendingSearchScrollRef.current = true;
    await runSearch(async () => {
      if (compareMode) {
        const [visual, semantic] = await Promise.all([
          searchImage(file, "visual", k),
          searchImage(file, "semantic", k),
        ]);
        setVisualResults(attachCallbacks(visual));
        setSemanticResults(attachCallbacks(semantic));
      } else {
        const data = await searchImage(file, mode, k);
        setResults(attachCallbacks(data));
      }
    });
  }

  async function handleRelaunch(imageId) {
    await runSearch(async () => {
      if (compareMode) {
        const [visual, semantic] = await Promise.all([
          searchById(imageId, "visual", k),
          searchById(imageId, "semantic", k),
        ]);
        setSelectedIds([]);
        setVisualResults(attachCallbacks(visual));
        setSemanticResults(attachCallbacks(semantic));
      } else {
        const data = await searchById(imageId, mode, k);
        setSelectedIds([]);
        setResults(attachCallbacks(data));
      }
    }, { clearExistingResults: false });
  }

  async function handleRelaunchMultiple(imageIds) {
    await runSearch(async () => {
      if (compareMode) {
        const [visual, semantic] = await Promise.all([
          searchByIds(imageIds, "visual", k),
          searchByIds(imageIds, "semantic", k),
        ]);
        setSelectedIds([]);
        setVisualResults(attachCallbacks(visual));
        setSemanticResults(attachCallbacks(semantic));
      } else {
        const data = await searchByIds(imageIds, mode, k);
        setSelectedIds([]);
        setResults(attachCallbacks(data));
      }
    }, { clearExistingResults: false });
  }

  async function handleSelectionSearch() {
    if (selectedIds.length === 0 || loading) return;
    await handleRelaunchMultiple(selectedIds);
  }

  function handleSelectionRemove(imageId) {
    setSelectedIds((currentIds) => currentIds.filter((currentId) => currentId !== imageId));
  }

  function handleModeChange(nextMode, { force = false } = {}) {
    if (nextMode === mode) return "noop";
    if (loading) return "blocked";

    const hasExistingResults = Boolean(results || visualResults || semanticResults);
    if (hasExistingResults && !force) {
      return "confirm";
    }

    if (force) {
      clearResults();
      setStatus(null);
    }

    setMode(nextMode);
    return "changed";
  }

  function exportJSON() {
    exportResultsAsJson(filteredResults, `results_${mode}.json`);
  }

  function exportCSV() {
    exportResultsAsCsv(filteredResults, `results_${mode}.csv`);
  }

  async function exportPDF() {
    await exportResultsAsPdf(filteredResults, `results_${mode}.pdf`);
  }

  function resetFilters() {
    setMinScore(0);
    setSearchText("");
    setCuiFilter("");
    setCuiPresence("all");
    setCuiModalite("");
    setCuiAnatomie("");
    setCuiFinding("");
    setActiveCaptionFilterIds([]);
    setReferenceFilter("");
    setSortOrder("desc");
  }

  const isAccent = compareMode || mode === "semantic";
  const useHomeVisualTone = !compareMode && mode === "visual";
  const isPreSearchState = !results && !visualResults && !loading;
  const stackedStagePanelHeightClass = "lg:h-[14rem]";
  const detailStagePanelHeightClass = "lg:h-[14.01rem]";
  const uploadPanelHeightClass = "lg:h-[29.25rem]";
  const lockedResultsStageHeightClass = "lg:h-[54.5rem]";
  const uploadPanelPaddingClass = "p-5";
  const topRightPanelPaddingClass = "p-5";
  const toneTransitionClass = toneTransitionReady ? "search-tone-transition" : "";
  const toneSyncClass = toneTransitionReady ? "search-tone-sync" : "";
  const uploadEntryClass = entryAnimationsActive ? "by-image-panel-enter-left" : "";
  const controlsEntryClass = entryAnimationsActive ? "by-image-panel-enter-down" : "";
  const launchEntryClass = entryAnimationsActive ? "by-image-panel-enter-up" : "";
  const infoEntryClass = entryAnimationsActive ? "by-image-panel-enter-up" : "";
  const selectedCaptionFilters = useMemo(
    () => getSelectedCaptionFilters(activeCaptionFilterIds, CURATED_CAPTION_FILTERS),
    [activeCaptionFilterIds]
  );
  const filterSuggestionRows = useMemo(
    () => (compareMode
      ? [...(visualResults?.results ?? []), ...(semanticResults?.results ?? [])]
      : results?.results ?? []),
    [compareMode, results, visualResults, semanticResults]
  );
  const suggestedCaptionFilters = useMemo(
    () => getSuggestedCaptionFilters(filterSuggestionRows, 6),
    [filterSuggestionRows]
  );
  const filterOptions = useMemo(
    () => ({
      minScore,
      captionFilter: searchText,
      sortOrder,
      cuiFilter,
      cuiPresence,
      cuiModalite,
      cuiAnatomie,
      cuiFinding,
      referenceFilter,
      captionTermGroups: selectedCaptionFilters.map((entry) => entry.terms),
    }),
    [
      minScore,
      searchText,
      sortOrder,
      cuiFilter,
      cuiPresence,
      cuiModalite,
      cuiAnatomie,
      cuiFinding,
      referenceFilter,
      selectedCaptionFilters,
    ]
  );
  const filteredResults = useMemo(
    () => filterResultsPayload(results, filterOptions),
    [results, filterOptions]
  );
  const filteredVisualResults = useMemo(
    () => filterResultsPayload(visualResults, filterOptions),
    [visualResults, filterOptions]
  );
  const filteredSemanticResults = useMemo(
    () => filterResultsPayload(semanticResults, filterOptions),
    [semanticResults, filterOptions]
  );
  const availableCuiByType = useMemo(() => {
    return buildAvailableCuiByType(filterSuggestionRows, CUI_TYPES);
  }, [filterSuggestionRows]);

  const singleResultCount = filteredResults?.results?.length ?? 0;
  const visualResultCount = filteredVisualResults?.results?.length ?? 0;
  const semanticResultCount = filteredSemanticResults?.results?.length ?? 0;
  const comparisonSource = queryPreviewUrl
    ? {
        src: queryPreviewUrl,
        alt: file?.name || resultsContent.queryImageLabel,
        meta: file?.name || "",
      }
    : null;
  const hasSearchResults = Boolean(results || visualResults);
  const supportsSelectionSearch = Boolean(
    (!compareMode && typeof results?.onRelaunchMultiple === "function")
      || (compareMode
        && typeof visualResults?.onRelaunchMultiple === "function"
        && typeof semanticResults?.onRelaunchMultiple === "function")
  );
  const selectedPreviewRows = useMemo(() => {
    const sourceRows = compareMode
      ? [...(visualResults?.results ?? []), ...(semanticResults?.results ?? [])]
      : (results?.results ?? []);
    const rowsById = new Map();
    for (const row of sourceRows) {
      if (!rowsById.has(row.image_id)) {
        rowsById.set(row.image_id, row);
      }
    }

    return selectedIds
      .slice(-4)
      .map((id) => rowsById.get(id) || { image_id: id, path: imageUrl(id) })
  }, [compareMode, results, visualResults, semanticResults, selectedIds]);
  const selectionPreviewOverflow = Math.max(0, selectedIds.length - selectedPreviewRows.length);
  const hasSelection = selectedIds.length > 0;
  const selectionCountLabel = selectedIds.length === 1
    ? resultsContent.selectedImageSingular
    : resultsContent.selectedImagePlural;
  const selectionSummaryLabel = hasSelection
    ? `${selectedIds.length} ${selectionCountLabel}`
    : resultsContent.selectionSummaryEmpty;
  const selectionDescription = hasSelection
    ? selectedIds.length === 1
      ? resultsContent.selectionReadySingle
      : resultsContent.selectionReadyPlural
    : resultsContent.selectionHint;
  const selectionActionLabel = selectedIds.length > 1
    ? resultsContent.selectionSearchPlural
    : resultsContent.selectionSearchSingle;
  const visualStagePanelClass = !compareMode && (mode === "visual" || mode === "semantic")
    ? "image-search-visual-stage-panel"
    : "";
  const filterPanelShellClass = isAccent
    ? "image-search-mode-shell image-search-mode-shell-accent"
    : useHomeVisualTone
      ? "image-search-mode-shell image-search-mode-shell-primary"
      : "border-primary/20 bg-primary/10";
  const activeFilterCount = [
    minScore > 0,
    Boolean(searchText.trim()),
    Boolean(cuiFilter.trim()),
    Boolean(referenceFilter.trim()),
    cuiPresence !== "all",
    activeCaptionFilterIds.length > 0,
    sortOrder !== "desc",
    Boolean(cuiModalite),
    Boolean(cuiAnatomie),
    Boolean(cuiFinding),
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
  const showConclusion = Boolean(
    (!compareMode && results) || (compareMode && visualResults && semanticResults)
  );
  const conclusionSearchResult = compareMode ? visualResults : results;
  const conclusionIsAccent = compareMode ? false : isAccent;
  const selectionCardToneClass = isAccent
    ? "text-accent"
    : useHomeVisualTone
      ? "mediscan-primary-text"
      : "text-primary";
  const selectionRelaunchNode = supportsSelectionSearch ? (
    <div className={`mt-0.5 lg:mt-1.5 mediscan-results-stage-enter search-tone-transition search-conclusion rounded-2xl border border-border bg-surface shadow-sm overflow-hidden ${isAccent ? "search-selection-panel-accent" : useHomeVisualTone ? "search-selection-panel-primary" : ""}`}>
      <div className="search-conclusion-header flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="min-w-0 flex items-center gap-2.5">
          <div className={`search-tone-sync ${selectionCardToneClass}`}>
            <Tags className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="search-tone-sync font-semibold text-text text-sm">
                {resultsContent.selectionPanelTitle}
              </span>
              <span
                aria-live="polite"
                className={`search-tone-sync inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${isAccent ? "mediscan-accent-chip" : useHomeVisualTone ? "mediscan-primary-chip" : "border-primary/20 bg-primary-pale text-primary"}`}
              >
                {selectionSummaryLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectionInfoClick}
            className={`info-trigger ${useHomeVisualTone ? "analysis-mode-info-trigger" : ""} ${isAccent ? "info-trigger-accent" : "info-trigger-primary"} inline-flex h-5.5 w-5.5 -translate-y-0.5 items-center justify-center text-sm font-medium ${filterOrderOnlyHighlighted ? isAccent ? "info-trigger-glow-accent" : "info-trigger-glow-primary" : ""} focus:outline-none focus:ring-2 ${isAccent ? "focus:ring-accent/25" : "focus:ring-primary/25"}`}
            aria-label={resultsContent.selectionHelpLabel}
            title={resultsContent.selectionHelpLabel}
          >
            <span aria-hidden="true" className="text-sm font-medium leading-none">i</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectionCardOpen((current) => !current)}
            className="search-conclusion-icon p-1.5 rounded-lg border border-border text-muted hover:text-text transition-all"
            aria-label={selectionCardOpen ? resultsContent.selectionCollapse : resultsContent.selectionExpand}
            title={selectionCardOpen ? resultsContent.selectionCollapse : resultsContent.selectionExpand}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: selectionCardOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.38s cubic-bezier(0.16, 1, 0.3, 1)" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {selectionCardOpen && (
        <div className="search-conclusion-body-enter px-5 py-4">
          <p className="search-tone-sync text-sm leading-6 text-muted">
            {selectionDescription}
          </p>

          {hasSelection && (
            <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              {selectedPreviewRows.map((row) => (
                <button
                  key={row.image_id}
                  type="button"
                  onClick={() => handleSelectionRemove(row.image_id)}
                  className={`group inline-flex w-full min-w-0 items-center gap-2 rounded-2xl border bg-bg/80 py-1 pl-1 pr-2 text-left transition-all sm:w-auto sm:max-w-full sm:rounded-full hover:-translate-y-0.5 ${isAccent ? "search-selection-chip-accent border-accent/18 hover:border-accent/32" : useHomeVisualTone ? "search-selection-chip-primary" : "border-border hover:border-primary/24"}`}
                  aria-label={`${resultsContent.removeSelectedImage}: ${row.image_id}`}
                  title={`${resultsContent.removeSelectedImage}: ${row.image_id}`}
                >
                  <img
                    src={row.path || imageUrl(row.image_id)}
                    alt={row.image_id}
                    className="h-9 w-9 rounded-full border border-bg object-cover bg-bg"
                  />
                  <span className={`${toneSyncClass} min-w-0 flex-1 truncate text-xs font-medium text-text sm:max-w-[12rem] sm:flex-none`}>
                    {row.image_id}
                  </span>
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-muted transition-all ${isAccent ? "search-selection-chip-remove-accent border-accent/14 group-hover:border-accent/26 group-hover:text-accent" : useHomeVisualTone ? "search-selection-chip-remove-primary" : "border-border group-hover:border-primary/24 group-hover:text-primary"}`}>
                    <X className="h-3.5 w-3.5" strokeWidth={2.1} />
                  </span>
                </button>
              ))}
              {selectionPreviewOverflow > 0 && (
                <span className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-dashed border-border bg-bg/70 px-4 text-xs font-semibold text-muted sm:w-auto sm:rounded-full">
                  +{selectionPreviewOverflow}
                </span>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={!hasSelection || loading}
              className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all ${hasSelection && !loading ? "cursor-pointer" : "cursor-not-allowed opacity-45"} ${isAccent ? "mediscan-accent-outline-button search-selection-clear-button-accent" : useHomeVisualTone ? "mediscan-primary-outline-button search-selection-clear-button-primary" : "border-border bg-bg text-muted hover:text-text hover:border-primary"}`}
            >
              {resultsContent.clearSelection}
            </button>
            <button
              type="button"
              onClick={handleSelectionSearch}
              disabled={!hasSelection || loading}
              className={`search-tone-sync search-conclusion-action inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all ${hasSelection && !loading ? "cursor-pointer" : "cursor-not-allowed opacity-45"} ${isAccent ? "mediscan-accent-action search-selection-relaunch-button-accent text-on-strong" : useHomeVisualTone ? "mediscan-primary-action search-selection-relaunch-button-primary text-on-strong" : "button-solid-primary"}`}
            >
              <Search className="h-3.5 w-3.5" strokeWidth={2.2} />
              <span>{selectionActionLabel}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  ) : null;
  const conclusionNode = showConclusion ? (
    <ClinicalConclusion
      searchResult={conclusionSearchResult}
      isAccent={conclusionIsAccent}
      className="mt-0.5 lg:mt-1.5 mediscan-results-stage-enter"
    />
  ) : null;
  const detailModeLabel = compareMode
    ? filters.compareOn
    : mode === "visual"
      ? content.modeVisual
      : content.modeSemantic;
  const detailChips = [
    { id: "mode", label: detailModeLabel },
    { id: "count", label: `${content.numResults}: ${String(k).padStart(2, "\u2007")}` },
  ];

  const highlightCaptionGuide = filterNoteHighlighted;
  const highlightScoreGuide = filterNoteHighlighted;
  const highlightRelaunchGuide = filterOrderOnlyHighlighted;
  const primaryQuickGuideHighlightClasses = getGuideHighlightClasses(quickNoteHighlighted, "primary");
  const accentQuickGuideHighlightClasses = getGuideHighlightClasses(quickNoteHighlighted, "accent");
  const filterSectionHighlightClasses = getGuideHighlightClasses(
    filterNoteHighlighted || filterOrderOnlyHighlighted,
    "primary",
  );
  const captionGuideHighlightClasses = getGuideHighlightClasses(highlightCaptionGuide, "primary");
  const scoreGuideHighlightClasses = getGuideHighlightClasses(highlightScoreGuide, "primary");
  const relaunchGuideHighlightClasses = getGuideHighlightClasses(highlightRelaunchGuide, "primary");
  const legendCards = [
    {
      id: "visual",
      icon: <VisualModeIcon className="h-4.5 w-4.5" />,
      iconWrapperClassName: `${toneSyncClass} search-legend-visual-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${primaryQuickGuideHighlightClasses.icon}`,
      label: content.image.legend.visual.label,
      title: content.image.legend.visual.title,
      description: content.image.legend.visual.description,
      note: content.image.legend.visual.note,
      headingClassName: `flex flex-wrap items-center gap-2 ${primaryQuickGuideHighlightClasses.heading}`,
      chipClassName: `${toneSyncClass} search-legend-visual-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${primaryQuickGuideHighlightClasses.chip}`,
      titleClassName: `${toneSyncClass} text-base font-bold text-title ${primaryQuickGuideHighlightClasses.title}`,
      descriptionClassName: `${toneSyncClass} mt-3 text-sm leading-7 text-muted ${primaryQuickGuideHighlightClasses.copy}`,
      noteClassName: `${toneSyncClass} mt-2 text-xs leading-6 text-muted ${primaryQuickGuideHighlightClasses.copy}`,
    },
    {
      id: "interpretive",
      icon: <InterpretiveModeIcon className="h-4.5 w-4.5" />,
      iconWrapperClassName: `${toneSyncClass} search-legend-interpretive-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${accentQuickGuideHighlightClasses.icon}`,
      label: content.image.legend.interpretive.label,
      title: content.image.legend.interpretive.title,
      description: content.image.legend.interpretive.description,
      note: content.image.legend.interpretive.note,
      headingClassName: `flex flex-wrap items-center gap-2 ${accentQuickGuideHighlightClasses.heading}`,
      chipClassName: `${toneSyncClass} search-legend-interpretive-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${accentQuickGuideHighlightClasses.chip}`,
      titleClassName: `${toneSyncClass} text-base font-bold text-title ${accentQuickGuideHighlightClasses.title}`,
      descriptionClassName: `${toneSyncClass} mt-3 text-sm leading-7 text-muted ${accentQuickGuideHighlightClasses.copy}`,
      noteClassName: `${toneSyncClass} mt-2 text-xs leading-6 text-muted ${accentQuickGuideHighlightClasses.copy}`,
    },
  ];
  const filterGuideCards = [
    {
      id: "caption",
      icon: <Tags className="h-4.5 w-4.5" />,
      iconWrapperClassName: `${toneSyncClass} search-filter-guide-badge-icon search-filter-guide-caption-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${captionGuideHighlightClasses.icon}`,
      chipClassName: `${toneSyncClass} search-filter-guide-badge-chip search-filter-guide-caption-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${captionGuideHighlightClasses.chip}`,
      label: filters.guide.caption.label,
      title: filters.guide.caption.title,
      description: filters.guide.caption.description,
      note: filters.guide.caption.note,
      highlightClasses: captionGuideHighlightClasses,
    },
    {
      id: "score",
      icon: <BadgePercent className="h-4.5 w-4.5" />,
      iconWrapperClassName: `${toneSyncClass} search-filter-guide-badge-icon search-filter-guide-score-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${scoreGuideHighlightClasses.icon}`,
      chipClassName: `${toneSyncClass} search-filter-guide-badge-chip search-filter-guide-score-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${scoreGuideHighlightClasses.chip}`,
      label: filters.guide.score.label,
      title: filters.guide.score.title,
      description: filters.guide.score.description,
      note: filters.guide.score.note,
      highlightClasses: scoreGuideHighlightClasses,
    },
    {
      id: "selection",
      icon: <Sparkles className="h-4.5 w-4.5" />,
      iconWrapperClassName: `${toneSyncClass} search-filter-guide-badge-icon search-filter-guide-combination-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${relaunchGuideHighlightClasses.icon}`,
      chipClassName: `${toneSyncClass} search-filter-guide-badge-chip search-filter-guide-combination-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${relaunchGuideHighlightClasses.chip}`,
      label: content.image.selectionGuide.label,
      title: content.image.selectionGuide.title,
      description: content.image.selectionGuide.description,
      note: content.image.selectionGuide.note,
      highlightClasses: relaunchGuideHighlightClasses,
    },
  ];

  useEffect(() => {
    onChromeToneChange?.(isAccent ? "accent" : "primary");
  }, [isAccent, onChromeToneChange]);

  useEffect(() => {
    let innerFrame = 0;
    const frame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setToneTransitionReady(true));
    });

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(innerFrame);
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => setEntryAnimationsActive(false), 1300);

    return () => {
      window.clearTimeout(timerId);
    };
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
          const gridNode = resultsCardsGridRef.current;
          if (!gridNode || typeof window === "undefined") {
            pendingSearchScrollRef.current = false;
            return;
          }

          // Ajuste cette valeur selon le rendu souhaite: negatif = moins bas, positif = plus bas.
          const IMAGE_SEARCH_SCROLL_OFFSET = 20;
          const boundedTargetY = getResultsGridScrollTargetY(gridNode, IMAGE_SEARCH_SCROLL_OFFSET);
          scrollCancelRef.current?.();

          if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
            window.scrollTo(0, boundedTargetY);
            pendingSearchScrollRef.current = false;
            return;
          }

          window.scrollTo({ top: boundedTargetY, behavior: "smooth" });
          const settleTimer = window.setTimeout(() => {
            scrollCancelRef.current = null;
            pendingSearchScrollRef.current = false;
          }, 760);
          scrollCancelRef.current = () => {
            window.clearTimeout(settleTimer);
          };
        }, 100);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(settleTimer);
      scrollCancelRef.current?.();
    };
  }, [loading, hasSearchResults, singleResultCount, visualResultCount, semanticResultCount]);

  function handleModeInfoClick() {
    scrollToInfoSection({
      sectionId: "image-search-quick-note",
      eyebrowId: "image-search-quick-note-eyebrow",
      scrollTimerRef: quickNoteScrollTimerRef,
      onComplete: () => restartNoteHighlight(setQuickNoteHighlighted, quickNoteHighlightTimerRef),
    });
  }

  function handleFilterInfoClick() {
    scrollToInfoSection({
      sectionId: "image-search-quick-note",
      eyebrowId: "image-search-quick-note-eyebrow",
      scrollTimerRef: quickNoteScrollTimerRef,
      onComplete: () => restartNoteHighlight(setFilterNoteHighlighted, filterNoteHighlightTimerRef),
    });

    window.clearTimeout(quickNoteHighlightTimerRef.current);
    setQuickNoteHighlighted(false);
    window.clearTimeout(filterNoteHighlightTimerRef.current);
    setFilterNoteHighlighted(false);
    setFilterOrderOnlyHighlighted(false);
  }

  function handleSelectionInfoClick() {
    scrollToInfoSection({
      sectionId: "image-search-quick-note",
      eyebrowId: "image-search-quick-note-eyebrow",
      scrollTimerRef: quickNoteScrollTimerRef,
      onComplete: () => restartNoteHighlight(setFilterOrderOnlyHighlighted, filterNoteHighlightTimerRef),
    });

    window.clearTimeout(quickNoteHighlightTimerRef.current);
    setQuickNoteHighlighted(false);

    window.clearTimeout(filterNoteHighlightTimerRef.current);
    setFilterNoteHighlighted(false);
    setFilterOrderOnlyHighlighted(false);
  }

  function handleCaptionFilterToggle(filterId) {
    setActiveCaptionFilterIds((currentIds) => (
      currentIds.includes(filterId)
        ? currentIds.filter((entryId) => entryId !== filterId)
        : [...currentIds, filterId]
    ));
  }

  const pageClass = [
    "search-workspace search-workspace-image",
    isAccent ? "search-workspace-accent search-semantic-theme" : "search-workspace-primary",
    "bg-transparent",
  ].filter(Boolean).join(" ");
  const filterPanelTitleClassName = `${toneSyncClass} text-sm font-bold uppercase tracking-[0.18em] text-title`;
  const filterPanelInfoButtonClassName = `${toneTransitionClass} info-trigger ${isAccent ? "info-trigger-accent" : "info-trigger-primary"} inline-flex h-5.5 w-5.5 items-center justify-center ${(filterNoteHighlighted || filterOrderOnlyHighlighted) ? isAccent ? "info-trigger-glow-accent" : "info-trigger-glow-primary" : ""} focus:outline-none focus:ring-2 ${isAccent ? "focus:ring-accent/25" : "focus:ring-primary/25"}`;
  const filterPanelHintClassName = `${toneSyncClass} mt-1 text-xs leading-5 text-muted`;
  const filterPanelResetButtonClassName = `search-toolbar-button rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${activeFilterCount > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-45"} ${isAccent ? "mediscan-accent-outline-button" : useHomeVisualTone ? "mediscan-primary-outline-button" : "border-border bg-bg text-muted hover:text-text hover:border-primary"}`;
  const filterLabelClassName = `${toneSyncClass} text-[10px] text-muted font-semibold uppercase tracking-wider`;
  const filterInputClassName = `search-workspace-field w-full rounded-xl border border-border bg-bg py-2.5 px-3 text-sm text-text placeholder:text-muted focus:outline-none ${isAccent ? "focus:border-accent" : "focus:border-primary"}`;
  const filterInputWithIconClassName = `search-workspace-field w-full rounded-xl border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-muted focus:outline-none ${isAccent ? "focus:border-accent" : "focus:border-primary"}`;
  const filterQuickTermsLabelClassName = `${toneSyncClass} text-[10px] font-semibold uppercase tracking-wider text-muted`;
  const filterQuickTermsHintClassName = `${toneSyncClass} text-[10px] text-muted`;
  const filterSelectLabelClassName = `${toneSyncClass} block text-[10px] text-muted/70 font-medium uppercase tracking-wider truncate`;
  const filterSelectClassName = `search-workspace-field w-full appearance-none rounded-lg border border-border bg-bg px-2 py-2 pr-6 text-xs text-text focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${isAccent ? "focus:border-accent" : "focus:border-primary"}`;
  const filterScoreSliderClassName = `${toneSyncClass} search-slider-track ${isAccent ? "search-slider-track-accent" : "search-slider-track-primary"} h-1.5 w-full rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer`;
  const filterScoreValueClassName = `${toneSyncClass} min-w-[2.8rem] text-right text-sm font-bold ${isAccent ? "mediscan-accent-text search-filter-score-value-accent" : useHomeVisualTone ? "search-filter-score-value-primary" : "text-primary"}`;
  const filterScoreScaleClassName = `${toneSyncClass} mt-2 flex items-center justify-between text-[11px] text-muted`;
  const filterSortShellClassName = `search-mode-shell mt-1.5 flex gap-1 rounded-xl border p-1 ${filterPanelShellClass} ${useHomeVisualTone ? "search-sort-shell-primary" : ""}`;
  const getCaptionFilterButtonClassName = (isActive) =>
    `search-mode-option inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium transition-all ${getFilterToggleStateClasses(isActive, isAccent, useHomeVisualTone)}`;
  const getSortOptionClassName = (_value, isActive) =>
    `search-mode-option flex-1 rounded-[0.8rem] border border-transparent px-3 py-2 text-xs font-medium transition-all ${getFilterToggleStateClasses(isActive, isAccent, useHomeVisualTone)} ${useHomeVisualTone ? `search-sort-option-primary ${isActive ? "search-sort-option-active-primary" : ""}` : ""}`;

  return (
    <div className={pageClass}>

      {/* Header with back button */}
      <section className="max-w-[1400px] mx-auto px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={onBack}
          className={`${toneTransitionClass} search-workspace-back inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-sm font-medium text-muted shadow-sm hover:shadow mb-6 ${isAccent ? "hover:text-accent hover:border-accent/30" : "hover:text-primary hover:border-primary/30"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {content.image.back}
        </button>
        <div className="text-center">
          <h1 className={`${toneSyncClass} text-4xl md:text-5xl font-bold text-title mb-3`}>
            {content.image.headline}
          </h1>
          <p className={`${toneSyncClass} text-lg text-muted max-w-2xl mx-auto`}>
            {content.description}
          </p>
        </div>
      </section>

      {/* Search Interface */}
      <div className="max-w-[1400px] mx-auto px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">

          {/* Upload - Left Sticky */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24">
              <div className={`${toneTransitionClass} image-search-panel ${visualStagePanelClass} ${isPreSearchState ? uploadEntryClass : ""} flex flex-col rounded-2xl border shadow-sm backdrop-blur-sm ${uploadPanelPaddingClass} ${uploadPanelHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-primary/30"}`}>
                <div className="mb-3">
                  <StepBadge
                    label={content.step1}
                    isAccent={isAccent}
                    useHomeVisualTone={useHomeVisualTone}
                    enableToneTransition={toneTransitionReady}
                  />
                </div>
                <p className={`${toneSyncClass} text-sm text-muted mb-3`}>{content.step1Desc}</p>
                <UploadZone
                  file={file}
                  onFileSelect={handleFileSelect}
                  onRemove={handleRemove}
                  isAccent={isAccent}
                  useHomeVisualTone={useHomeVisualTone}
                  fillHeight
                  enableToneTransition={toneTransitionReady}
                />
              </div>
            </div>
          </div>

          {/* Controls & Results - Right */}
          <div className="lg:col-span-2">

            {/* Controls */}
            <div className={`${toneTransitionClass} image-search-panel image-search-controls-stage-panel ${visualStagePanelClass} ${isPreSearchState ? controlsEntryClass : ""} rounded-2xl border shadow-sm backdrop-blur-sm mb-5 ${topRightPanelPaddingClass} ${stackedStagePanelHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-primary/30"} flex flex-col`}>
              <div className="mb-3">
                <StepBadge
                  label={content.step2}
                  isAccent={isAccent}
                  useHomeVisualTone={useHomeVisualTone}
                  enableToneTransition={toneTransitionReady}
                />
              </div>
              <div className="mt-auto">
                <Controls
                  mode={mode}
                  onModeChange={handleModeChange}
                  k={k}
                  onKChange={setK}
                  onSearch={handleSearch}
                  disabled={!file || loading}
                  loading={loading}
                  useHomeVisualTone={useHomeVisualTone}
                  enableToneTransition={toneTransitionReady}
                  modeToggleDisabled={loading}
                  modeChangeGuardActive={hasSearchResults}
                  modeChangeConfirmMessage={content.image.modeChangeConfirm}
                  modeChangeConfirmActionLabel={content.image.modeChangeConfirmAction}
                  modeChangeCancelLabel={content.image.modeChangeCancel}
                  onModeInfoClick={handleModeInfoClick}
                  modeInfoLabel={content.image.modeInfoLabel}
                  modeInfoHighlighted={quickNoteHighlighted}
                />
              </div>
            </div>

            {/* Status */}
            <StatusBar
              status={status?.type === "error" ? status : null}
              tone={isAccent ? "accent" : "primary"}
              useHomeVisualTone={useHomeVisualTone}
              enableToneTransition={toneTransitionReady}
            />

            <div className={`${toneTransitionClass} image-search-panel ${visualStagePanelClass} mediscan-stage-panel-enter ${launchEntryClass} rounded-2xl p-6 md:p-7 border shadow-sm ${detailStagePanelHeightClass} ${isAccent || useHomeVisualTone ? (isAccent ? "mediscan-accent-surface" : "mediscan-primary-surface") : "ui-surface"} flex flex-col justify-between text-left`}>
                <div>
                  <StepBadge
                    label={content.image.detailStep}
                    isAccent={isAccent}
                    useHomeVisualTone={useHomeVisualTone}
                    enableToneTransition={toneTransitionReady}
                  />
                  {file ? (
                    <div className="mt-4">
                      <h3 className={`${toneSyncClass} text-xl md:text-[1.35rem] font-bold ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-primary"}`}>
                        {content.image.pendingTitle}
                      </h3>
                      <p className={`${toneSyncClass} mt-2.5 max-w-2xl text-sm leading-6 ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-muted"}`}>
                        {content.image.pendingDescription}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-start gap-3">
                      <div className={`${toneSyncClass} image-search-detail-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isAccent ? "mediscan-accent-chip image-search-detail-icon-accent" : useHomeVisualTone ? "mediscan-primary-chip image-search-detail-icon-primary" : "border border-primary/20 bg-primary-pale text-primary"}`}>
                        <Search className="w-4.5 h-4.5" strokeWidth={1.8} />
                      </div>
                      <div>
                        <h3 className={`${toneSyncClass} text-xl md:text-[1.35rem] font-bold ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-primary"}`}>
                          {content.image.readyTitle}
                        </h3>
                        <p className={`${toneSyncClass} mt-2.5 max-w-2xl text-sm leading-6 ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-muted"}`}>
                          {content.image.readyDescription}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {detailChips.map((chip) => (
                      <span
                        key={chip.id}
                        className={`${toneSyncClass} inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          isAccent
                            ? "mediscan-accent-chip image-search-detail-chip-accent"
                            : useHomeVisualTone
                              ? "mediscan-primary-chip image-search-detail-chip-primary"
                              : "border-primary/20 bg-primary-pale text-primary"
                        }`}
                        style={chip.id === "count" ? { fontVariantNumeric: "tabular-nums" } : undefined}
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
          </div>

          {hasSearchResults && (
            <div className="lg:col-span-3">
              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,0.88fr)_minmax(0,2.12fr)] lg:items-start lg:gap-6">
                <div className="lg:self-start">
                  <div className={`${toneTransitionClass} image-search-panel image-search-filter-stage-panel mediscan-results-stage-enter rounded-2xl border p-5 shadow-sm backdrop-blur-sm lg:flex lg:flex-col ${lockedResultsStageHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-border"}`}>
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

                  <div className="mt-5 space-y-3.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                    <SearchCaptionFilterCard
                      label={filters.caption}
                      labelClassName={filterLabelClassName}
                      value={searchText}
                      onChange={setSearchText}
                      placeholder={filters.captionPlaceholder}
                      inputWrapperClassName="mt-1.5"
                      inputClassName={filterInputWithIconClassName}
                      leadingIcon={(
                        <svg className={`${toneSyncClass} absolute left-3 top-1/2 -translate-y-1/2 text-muted`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      )}
                      suggestedFilters={hasSuggestedCaptionFilters ? suggestedCaptionFilters : []}
                      activeFilterIds={activeCaptionFilterIds}
                      onToggleFilter={handleCaptionFilterToggle}
                      getToggleClassName={getCaptionFilterButtonClassName}
                      quickTermsLabel={filters.quickTerms}
                      quickTermsLabelClassName={filterQuickTermsLabelClassName}
                      quickTermsHint={filters.quickTermsHint}
                      quickTermsHintClassName={filterQuickTermsHintClassName}
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
                      scoreStyle={useHomeVisualTone && !isAccent ? { color: "#173b43", WebkitTextFillColor: "#173b43" } : undefined}
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
                      labelClassName={`${filterLabelClassName} ${useHomeVisualTone ? "search-sort-label-primary" : ""}`}
                      shellClassName={filterSortShellClassName}
                      options={sortOptions}
                      currentValue={sortOrder}
                      onChange={setSortOrder}
                      getOptionClassName={getSortOptionClassName}
                    />
                  </div>
                </div>
              </div>
              <div className="min-w-0">
              {!compareMode && results && (
                <>
                  <ResultsGrid
                    data={filteredResults}
                    useHomeVisualTone={useHomeVisualTone}
                    className="mt-0"
                    headerHiddenOnDesktop
                    animateOnMount
                    onExportJson={exportJSON}
                    onExportCsv={exportCSV}
                    onExportPdf={exportPDF}
                    selectedIds={selectedIds}
                    onSelectedIdsChange={setSelectedIds}
                    comparisonSource={comparisonSource}
                    cardsGridExternalRef={resultsCardsGridRef}
                    desktopLockedHeightClass={lockedResultsStageHeightClass}
                    desktopThreeColumns
                  />
                </>
              )}

              {compareMode && visualResults && semanticResults && (
                <>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className={`${toneSyncClass} text-sm font-bold text-primary mb-3 uppercase tracking-wider`}>{t.search.results.visualMode}</h3>
                      <ResultsGrid
                        data={filteredVisualResults}
                        useHomeVisualTone
                        className="mt-4"
                        animateOnMount
                        selectedIds={selectedIds}
                        onSelectedIdsChange={setSelectedIds}
                        comparisonSource={comparisonSource}
                        cardsGridExternalRef={resultsCardsGridRef}
                        desktopLockedHeightClass={lockedResultsStageHeightClass}
                      />
                    </div>
                    <div>
                      <h3 className={`${toneSyncClass} text-sm font-bold text-accent mb-3 uppercase tracking-wider`}>{t.search.results.semanticMode}</h3>
                      <ResultsGrid
                        data={filteredSemanticResults}
                        className="mt-4"
                        animateOnMount
                        selectedIds={selectedIds}
                        onSelectedIdsChange={setSelectedIds}
                        comparisonSource={comparisonSource}
                        desktopLockedHeightClass={lockedResultsStageHeightClass}
                      />
                    </div>
                  </div>
                </>
              )}
                  {selectionRelaunchNode}
                  {conclusionNode}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <section
        id="image-search-quick-note"
        className="image-search-guide-fixed-visual scroll-mt-28 max-w-[1400px] mx-auto px-4 pb-28 sm:px-6 lg:pb-36"
      >
        <div className={`${infoEntryClass} image-search-guide-divider border-t border-border/70 pt-7`}>
          <SearchGuideSectionHeader
            eyebrowId="image-search-quick-note-eyebrow"
            eyebrow={content.image.legendEyebrow}
            title={content.image.legendTitle}
            description={content.image.legendDescription}
            eyebrowClassName={`${toneSyncClass} text-[11px] font-semibold uppercase tracking-[0.18em] text-muted`}
            titleClassName={`${toneSyncClass} mt-4 text-xl font-bold text-title md:text-2xl`}
            descriptionClassName={`${toneSyncClass} mt-2 max-w-2xl text-sm leading-7 text-muted`}
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
            id="image-search-filters-note"
            className="image-search-guide-divider mt-10 border-t border-border/70 pt-7"
          >
            <SearchGuideSectionHeader
              eyebrowId="image-search-filters-note-eyebrow"
              eyebrow={filters.guide.eyebrow}
              title={filters.guide.title}
              description={filters.guide.description}
              eyebrowClassName={`${toneSyncClass} text-[11px] font-semibold uppercase tracking-[0.18em] text-muted ${filterSectionHighlightClasses.heading}`}
              titleClassName={`${toneSyncClass} mt-4 text-xl font-bold text-title md:text-2xl ${filterSectionHighlightClasses.title}`}
              descriptionClassName={`${toneSyncClass} mt-2 max-w-2xl text-sm leading-7 text-muted ${filterSectionHighlightClasses.copy}`}
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
                  headingClassName={`flex flex-wrap items-center gap-2 ${card.highlightClasses.heading}`}
                  chipClassName={card.chipClassName}
                  titleClassName={`${toneSyncClass} text-base font-bold text-title ${card.highlightClasses.title}`}
                  descriptionClassName={`${toneSyncClass} mt-3 text-sm leading-7 text-muted ${card.highlightClasses.copy}`}
                  noteClassName={`${toneSyncClass} self-end pt-2 text-xs leading-6 text-muted ${card.highlightClasses.copy}`}
                />
              ))}
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
