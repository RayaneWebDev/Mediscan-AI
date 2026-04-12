import { BadgePercent, Info, Search, Sparkles, Tags, X } from "lucide-react";
import { useState, useContext, useEffect, useMemo, useRef } from "react";
import { LangContext } from "../context/LangContext";
import UploadZone from "./UploadZone";
import Controls from "./Controls";
import StatusBar from "./StatusBar";
import ResultsGrid from "./ResultsGrid";
import { searchImage, searchById, searchByIds, imageUrl } from "../api";
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
import { VisualModeIcon, InterpretiveModeIcon } from "./icons";
import { CUI_TYPES } from "../data/cuiCategories";

function StepBadge({ label, isAccent, useHomeVisualTone, enableToneTransition = false }) {
  const toneClass = isAccent
    ? "mediscan-accent-chip"
    : useHomeVisualTone
      ? "mediscan-primary-chip"
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

export default function ImageSearchView({ onBack, onChromeToneChange, useSharedSurface = false }) {
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
  const [compareMode, setCompareMode] = useState(false);
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
  const resultsAutoScrollTimerRef = useRef(0);
  const resultsCardsGridRef = useRef(null);
  const pendingSearchScrollRef = useRef(false);
  const [referenceFilter, setReferenceFilter] = useState("");

  useEffect(() => {
    return () => {
      window.clearTimeout(quickNoteHighlightTimerRef.current);
      window.clearTimeout(filterNoteHighlightTimerRef.current);
      window.clearTimeout(quickNoteScrollTimerRef.current);
      window.clearTimeout(resultsAutoScrollTimerRef.current);
      if (queryPreviewUrl) {
        URL.revokeObjectURL(queryPreviewUrl);
      }
    };
  }, [queryPreviewUrl]);

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

  async function runSearch(action) {
    setLoading(true);
    setStatus(null);
    clearResults();

    try {
      await action();
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
        setVisualResults(attachCallbacks(visual));
        setSemanticResults(attachCallbacks(semantic));
      } else {
        const data = await searchById(imageId, mode, k);
        setResults(attachCallbacks(data));
      }
    });
  }

  async function handleRelaunchMultiple(imageIds) {
    await runSearch(async () => {
      if (compareMode) {
        const [visual, semantic] = await Promise.all([
          searchByIds(imageIds, "visual", k),
          searchByIds(imageIds, "semantic", k),
        ]);
        setVisualResults(attachCallbacks(visual));
        setSemanticResults(attachCallbacks(semantic));
      } else {
        const data = await searchByIds(imageIds, mode, k);
        setResults(attachCallbacks(data));
      }
    });
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
    () => activeCaptionFilterIds
      .map((filterId) => CURATED_CAPTION_FILTERS.find((entry) => entry.id === filterId))
      .filter(Boolean),
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
  const filterOptions = {
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
  };
  const filteredResults = useMemo(
    () => filterResultsPayload(results, filterOptions),
    [results, minScore, searchText, sortOrder, cuiFilter, cuiPresence, cuiModalite, cuiAnatomie, cuiFinding, referenceFilter, selectedCaptionFilters]
  );
  const filteredVisualResults = useMemo(
    () => filterResultsPayload(visualResults, filterOptions),
    [visualResults, minScore, searchText, sortOrder, cuiFilter, cuiPresence, cuiModalite, cuiAnatomie, cuiFinding, referenceFilter, selectedCaptionFilters]
  );
  const filteredSemanticResults = useMemo(
    () => filterResultsPayload(semanticResults, filterOptions),
    [semanticResults, minScore, searchText, sortOrder, cuiFilter, cuiPresence, cuiModalite, cuiAnatomie, cuiFinding, referenceFilter, selectedCaptionFilters]
  );
  const availableCuiByType = useMemo(() => {
    const raw = compareMode
      ? [...(visualResults?.results ?? []), ...(semanticResults?.results ?? [])]
      : (results?.results ?? []);
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
  }, [results, visualResults, semanticResults, compareMode]);

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
  const canExport = Boolean(!compareMode && filteredResults);
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
    <div className="mt-0.5 lg:mt-1.5 mediscan-results-stage-enter search-tone-transition search-conclusion rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
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
            className="search-conclusion-icon p-1.5 rounded-lg border border-border text-muted hover:text-text transition-all"
            aria-label={resultsContent.selectionHelpLabel}
            title={resultsContent.selectionHelpLabel}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} />
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
                  className={`group inline-flex w-full min-w-0 items-center gap-2 rounded-2xl border bg-bg/80 py-1 pl-1 pr-2 text-left transition-all sm:w-auto sm:max-w-full sm:rounded-full hover:-translate-y-0.5 ${isAccent ? "border-accent/18 hover:border-accent/32" : useHomeVisualTone ? "border-primary/18 hover:border-primary/32" : "border-border hover:border-primary/24"}`}
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
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-muted transition-all ${isAccent ? "border-accent/14 group-hover:border-accent/26 group-hover:text-accent" : useHomeVisualTone ? "border-primary/14 group-hover:border-primary/26 group-hover:text-primary" : "border-border group-hover:border-primary/24 group-hover:text-primary"}`}>
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
              className={`inline-flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all ${hasSelection && !loading ? "cursor-pointer" : "cursor-not-allowed opacity-45"} ${isAccent ? "mediscan-accent-outline-button" : useHomeVisualTone ? "mediscan-primary-outline-button" : "border-border bg-bg text-muted hover:text-text hover:border-primary"}`}
            >
              {resultsContent.clearSelection}
            </button>
            <button
              type="button"
              onClick={handleSelectionSearch}
              disabled={!hasSelection || loading}
              className={`search-tone-sync search-conclusion-action inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all ${hasSelection && !loading ? "cursor-pointer" : "cursor-not-allowed opacity-45"} ${isAccent ? "mediscan-accent-action text-on-strong" : useHomeVisualTone ? "mediscan-primary-action text-on-strong" : "button-solid-primary"}`}
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
  const detailChips = file
    ? [
        { id: "mode", label: detailModeLabel },
        { id: "count", label: `${content.numResults}: ${k}` },
        { id: "action", label: content.search },
      ]
    : [
        { id: "formats", label: content.image.acceptedFormats },
        { id: "count", label: `${content.numResults}: ${k}` },
        { id: "mode", label: detailModeLabel },
      ];

  const highlightCaptionGuide = filterNoteHighlighted;
  const highlightScoreGuide = filterNoteHighlighted;
  const highlightRelaunchGuide = filterOrderOnlyHighlighted;

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
  }, [loading, hasSearchResults, singleResultCount, visualResultCount, semanticResultCount]);

  function restartNoteHighlight(setter, timerRef) {
    window.clearTimeout(timerRef.current);
    setter(false);

    requestAnimationFrame(() => {
      setter(true);
      timerRef.current = window.setTimeout(() => {
        setter(false);
      }, 2200);
    });
  }

  function animateScrollTo(targetY, onComplete) {
    window.clearTimeout(quickNoteScrollTimerRef.current);

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      window.scrollTo(0, targetY);
      onComplete?.();
      return;
    }

    window.scrollTo({ top: targetY, behavior: "smooth" });
    quickNoteScrollTimerRef.current = window.setTimeout(() => {
      quickNoteScrollTimerRef.current = 0;
      onComplete?.();
    }, 760);
  }

  function scrollToInfoSection(sectionId, eyebrowId, onComplete) {
    const targetSection = document.getElementById(sectionId);
    const targetEyebrow = eyebrowId ? document.getElementById(eyebrowId) : null;
    if (!targetSection) return;

    const targetNode = targetEyebrow || targetSection;
    const targetTop = targetNode.getBoundingClientRect().top + window.scrollY;
    const topOffset = window.innerWidth >= 1024 ? 78 : window.innerWidth >= 768 ? 72 : 66;
    let targetY = Math.max(0, targetTop - topOffset);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    targetY = Math.max(0, Math.min(targetY, maxScroll));

    animateScrollTo(targetY, onComplete);
  }

  function handleModeInfoClick() {
    scrollToInfoSection(
      "image-search-quick-note",
      "image-search-quick-note-eyebrow",
      () => restartNoteHighlight(setQuickNoteHighlighted, quickNoteHighlightTimerRef)
    );
  }

  function handleFilterInfoClick() {
    scrollToInfoSection(
      "image-search-quick-note",
      "image-search-quick-note-eyebrow",
      () => restartNoteHighlight(setFilterNoteHighlighted, filterNoteHighlightTimerRef)
    );

    window.clearTimeout(quickNoteHighlightTimerRef.current);
    setQuickNoteHighlighted(false);
    window.clearTimeout(filterNoteHighlightTimerRef.current);
    setFilterNoteHighlighted(false);
    setFilterOrderOnlyHighlighted(false);
  }

  function handleSelectionInfoClick() {
    scrollToInfoSection(
      "image-search-quick-note",
      "image-search-quick-note-eyebrow",
      () => restartNoteHighlight(setFilterOrderOnlyHighlighted, filterNoteHighlightTimerRef)
    );

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
              <div className={`${toneTransitionClass} image-search-panel ${isPreSearchState ? uploadEntryClass : ""} flex flex-col rounded-2xl border shadow-sm backdrop-blur-sm ${uploadPanelPaddingClass} ${uploadPanelHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-primary/30"}`}>
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
            <div className={`${toneTransitionClass} image-search-panel ${isPreSearchState ? controlsEntryClass : ""} rounded-2xl border shadow-sm backdrop-blur-sm mb-5 ${topRightPanelPaddingClass} ${stackedStagePanelHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-primary/30"} flex flex-col`}>
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

            {/* Empty State - file selected, no results */}
            {file && (
              <div className={`${toneTransitionClass} image-search-panel mediscan-stage-panel-enter ${launchEntryClass} rounded-2xl p-6 md:p-7 border shadow-sm backdrop-blur-sm ${detailStagePanelHeightClass} ${isAccent || useHomeVisualTone ? (isAccent ? "mediscan-accent-surface" : "mediscan-primary-surface") : "ui-surface"} flex flex-col justify-between text-left`}>
                <div>
                  <StepBadge
                    label={content.image.detailStep}
                    isAccent={isAccent}
                    useHomeVisualTone={useHomeVisualTone}
                    enableToneTransition={toneTransitionReady}
                  />
                  <h3 className={`${toneSyncClass} mt-4 text-xl md:text-[1.35rem] font-bold ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-primary"}`}>
                    {content.image.pendingTitle}
                  </h3>
                  <p className={`${toneSyncClass} mt-2.5 max-w-2xl text-sm leading-6 ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-muted"}`}>
                    {content.image.pendingDescription}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {detailChips.map((chip) => (
                      <span
                        key={chip.id}
                        className={`${toneSyncClass} inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          isAccent
                            ? "mediscan-accent-chip"
                            : useHomeVisualTone
                              ? "mediscan-primary-chip"
                              : "border-primary/20 bg-primary-pale text-primary"
                        }`}
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Empty State - no file */}
            {!file && !hasSearchResults && (
              <div className={`${toneTransitionClass} image-search-panel mediscan-stage-panel-enter ${launchEntryClass} rounded-2xl p-6 md:p-7 border shadow-sm ${detailStagePanelHeightClass} ${isAccent || useHomeVisualTone ? (isAccent ? "mediscan-accent-surface" : "mediscan-primary-surface") : "ui-surface"} flex flex-col justify-between text-left`}>
                <div>
                  <StepBadge
                    label={content.image.detailStep}
                    isAccent={isAccent}
                    useHomeVisualTone={useHomeVisualTone}
                    enableToneTransition={toneTransitionReady}
                  />
                  <div className="mt-4 flex items-start gap-3">
                    <div className={`${toneSyncClass} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isAccent ? "mediscan-accent-chip" : useHomeVisualTone ? "mediscan-primary-chip" : "border-primary/20 bg-primary-pale text-primary"}`}>
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
                  <div className="mt-5 flex flex-wrap gap-2">
                    {detailChips.map((chip) => (
                      <span
                        key={chip.id}
                        className={`${toneSyncClass} inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          isAccent
                            ? "mediscan-accent-chip"
                            : useHomeVisualTone
                              ? "mediscan-primary-chip"
                              : "border-primary/20 bg-primary-pale text-primary"
                        }`}
                      >
                        {chip.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {hasSearchResults && (
            <div className="lg:col-span-3">
              <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(300px,0.88fr)_minmax(0,2.12fr)] lg:items-start lg:gap-6">
                <div className="lg:self-start">
                  <div className={`${toneTransitionClass} image-search-panel mediscan-results-stage-enter rounded-2xl border p-5 shadow-sm backdrop-blur-sm lg:flex lg:flex-col ${lockedResultsStageHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-border"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`${toneSyncClass} text-sm font-bold uppercase tracking-[0.18em] text-title`}>
                          {filters.title}
                        </h3>
                        <button
                          type="button"
                          onClick={handleFilterInfoClick}
                          className={`${toneTransitionClass} inline-flex h-5.5 w-5.5 items-center justify-center rounded-md text-muted transition-all hover:bg-primary/6 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/25`}
                          aria-label={filters.infoLabel}
                          title={filters.infoLabel}
                        >
                          <Info className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                        </button>
                        {activeFilterCount > 0 && (
                          <span className={`${toneSyncClass} inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${isAccent ? "mediscan-accent-chip" : useHomeVisualTone ? "mediscan-primary-chip" : "border-primary/20 bg-primary-pale text-primary"}`}>
                            {activeFilterCount}
                          </span>
                        )}
                      </div>
                      <p className={`${toneSyncClass} mt-1 text-xs leading-5 text-muted`}>
                        {filters.refineHint}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetFilters}
                      disabled={activeFilterCount === 0}
                      className={`search-toolbar-button rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${activeFilterCount > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-45"} ${isAccent ? "mediscan-accent-outline-button" : useHomeVisualTone ? "mediscan-primary-outline-button" : "border-border bg-bg text-muted hover:text-text hover:border-primary"}`}
                    >
                      {filters.reset}
                    </button>
                  </div>

                  <div className="mt-5 space-y-3.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
                    <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                      <label className={`${toneSyncClass} text-[10px] text-muted font-semibold uppercase tracking-wider`}>
                        {filters.caption}
                      </label>
                      <div className="relative mt-1.5">
                        <svg className={`${toneSyncClass} absolute left-3 top-1/2 -translate-y-1/2 text-muted`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                          type="text"
                          placeholder={filters.captionPlaceholder}
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className={`search-workspace-field w-full rounded-xl border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-text placeholder:text-muted focus:outline-none ${isAccent ? "focus:border-accent" : "focus:border-primary"}`}
                        />
                      </div>

                      {hasSuggestedCaptionFilters && (
                        <div className="mt-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <p className={`${toneSyncClass} text-[10px] font-semibold uppercase tracking-wider text-muted`}>
                              {filters.quickTerms}
                            </p>
                            <span className={`${toneSyncClass} text-[10px] text-muted`}>
                              {filters.quickTermsHint}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {suggestedCaptionFilters.map((entry) => {
                              const isActive = activeCaptionFilterIds.includes(entry.id);

                              return (
                                <button
                                  key={entry.id}
                                  type="button"
                                  onClick={() => handleCaptionFilterToggle(entry.id)}
                                  className={`search-mode-option inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium transition-all ${getFilterToggleStateClasses(isActive, isAccent, useHomeVisualTone)}`}
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

                    <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                      <div>
                        <label className={`${toneSyncClass} text-[10px] text-muted font-semibold uppercase tracking-wider`}>
                          {filters.cui}
                        </label>
                        <input
                          type="text"
                          value={cuiFilter}
                          onChange={(e) => setCuiFilter(e.target.value)}
                          placeholder={filters.cuiPlaceholder}
                          className={`search-workspace-field mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none ${isAccent ? "focus:border-accent" : "focus:border-primary"}`}
                        />
                      </div>

                      <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {[
                          [filters.cuiModalite, cuiModalite, setCuiModalite, availableCuiByType.modalite],
                          [filters.cuiAnatomie, cuiAnatomie, setCuiAnatomie, availableCuiByType.anatomie],
                          [filters.cuiFinding, cuiFinding, setCuiFinding, availableCuiByType.finding],
                        ].map(([label, value, setter, options]) => (
                          <div key={label}>
                            <label className={`${toneSyncClass} block text-[10px] text-muted/70 font-medium uppercase tracking-wider truncate`}>
                              {label}
                            </label>
                            <div className="relative mt-1">
                              <select
                                value={value}
                                onChange={(e) => setter(e.target.value)}
                                disabled={options.length === 0}
                                className={`search-workspace-field w-full appearance-none rounded-lg border border-border bg-bg px-2 py-2 pr-6 text-xs text-text focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${isAccent ? "focus:border-accent" : "focus:border-primary"}`}
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

                    <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                      <label className={`${toneSyncClass} text-[10px] text-muted font-semibold uppercase tracking-wider`}>
                        {filters.minScore}
                      </label>
                      <div className="mt-2.5 flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={minScore}
                          onChange={(e) => setMinScore(Number(e.target.value))}
                          className={`${toneSyncClass} search-slider-track ${isAccent ? "search-slider-track-accent" : "search-slider-track-primary"} h-1.5 w-full rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer`}
                        />
                        <span className={`${toneSyncClass} min-w-[2.8rem] text-right text-sm font-bold ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-primary"}`}>
                          {Math.round(minScore * 100)}%
                        </span>
                      </div>
                      <div className={`${toneSyncClass} mt-2 flex items-center justify-between text-[11px] text-muted`}>
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>

                    <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                      <label className={`${toneSyncClass} text-[10px] text-muted font-semibold uppercase tracking-wider`}>
                        {filters.reference}
                      </label>
                      <input
                        type="text"
                        value={referenceFilter}
                        onChange={(e) => setReferenceFilter(e.target.value)}
                        placeholder={filters.referencePlaceholder}
                        className={`search-workspace-field mt-1.5 w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none ${isAccent ? "focus:border-accent" : "focus:border-primary"}`}
                      />
                    </div>

                    <div className="rounded-[1.2rem] border border-border/70 bg-bg/60 p-3.5">
                      <label className={`${toneSyncClass} text-[10px] text-muted font-semibold uppercase tracking-wider`}>
                        {filters.sort}
                      </label>
                      <div className={`search-mode-shell mt-1.5 flex gap-1 rounded-xl border p-1 ${filterPanelShellClass}`}>
                        {[
                          ["desc", filters.sortDesc],
                          ["asc", filters.sortAsc],
                        ].map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSortOrder(value)}
                            className={`search-mode-option flex-1 rounded-[0.8rem] border border-transparent px-3 py-2 text-xs font-medium transition-all ${getFilterToggleStateClasses(sortOrder === value, isAccent, useHomeVisualTone)}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
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
        className="scroll-mt-28 max-w-[1400px] mx-auto px-4 pb-28 sm:px-6 lg:pb-36"
      >
        <div className={`${infoEntryClass} border-t border-border/70 pt-7`}>
          <div className="max-w-3xl">
            <p
              id="image-search-quick-note-eyebrow"
              className={`${toneSyncClass} text-[11px] font-semibold uppercase tracking-[0.18em] text-muted`}
            >
              {content.image.legendEyebrow}
            </p>
            <h2 className={`${toneSyncClass} mt-4 text-xl font-bold text-title md:text-2xl`}>
              {content.image.legendTitle}
            </h2>
            <p className={`${toneSyncClass} mt-2 max-w-2xl text-sm leading-7 text-muted`}>
              {content.image.legendDescription}
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <article className="flex items-start gap-4">
              <div className={`${toneSyncClass} mediscan-primary-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${quickNoteHighlighted ? "quick-note-icon-glow-primary" : ""}`}>
                <VisualModeIcon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className={`flex flex-wrap items-center gap-2 ${quickNoteHighlighted ? "quick-note-heading-glow-primary" : ""}`}>
                  <span className={`${toneSyncClass} mediscan-primary-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${quickNoteHighlighted ? "quick-note-chip-glow-primary" : ""}`}>
                    {content.image.legend.visual.label}
                  </span>
                  <h3 className={`${toneSyncClass} text-base font-bold text-title ${quickNoteHighlighted ? "quick-note-title-glow-primary" : ""}`}>
                    {content.image.legend.visual.title}
                  </h3>
                </div>
                <p className={`${toneSyncClass} mediscan-primary-text mt-3 text-sm leading-7`}>
                  {content.image.legend.visual.description}
                </p>
                <p className={`${toneSyncClass} mt-2 text-xs leading-6 text-muted`}>
                  {content.image.legend.visual.note}
                </p>
              </div>
            </article>

            <article className="flex items-start gap-4">
              <div className={`${toneSyncClass} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/18 bg-accent-pale text-accent ${quickNoteHighlighted ? "quick-note-icon-glow-accent" : ""}`}>
                <InterpretiveModeIcon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className={`flex flex-wrap items-center gap-2 ${quickNoteHighlighted ? "quick-note-heading-glow-accent" : ""}`}>
                  <span className={`${toneSyncClass} mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${quickNoteHighlighted ? "quick-note-chip-glow-accent" : ""}`}>
                    {content.image.legend.interpretive.label}
                  </span>
                  <h3 className={`${toneSyncClass} text-base font-bold text-title ${quickNoteHighlighted ? "quick-note-title-glow-accent" : ""}`}>
                    {content.image.legend.interpretive.title}
                  </h3>
                </div>
                <p className={`${toneSyncClass} mediscan-accent-text mt-3 text-sm leading-7`}>
                  {content.image.legend.interpretive.description}
                </p>
                <p className={`${toneSyncClass} mt-2 text-xs leading-6 text-muted`}>
                  {content.image.legend.interpretive.note}
                </p>
              </div>
            </article>
          </div>

          <div
            id="image-search-filters-note"
            className="mt-10 border-t border-border/70 pt-7"
          >
            <div className="max-w-3xl">
              <p
                id="image-search-filters-note-eyebrow"
                className={`${toneSyncClass} text-[11px] font-semibold uppercase tracking-[0.18em] text-muted`}
              >
                {filters.guide.eyebrow}
              </p>
              <h2 className={`${toneSyncClass} mt-4 text-xl font-bold text-title md:text-2xl`}>
                {filters.guide.title}
              </h2>
              <p className={`${toneSyncClass} mt-2 max-w-2xl text-sm leading-7 text-muted`}>
                {filters.guide.description}
              </p>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-3">
              <article className="flex h-full items-start gap-4">
                <div className={`${toneSyncClass} mediscan-primary-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${highlightCaptionGuide ? "quick-note-icon-glow-primary" : ""}`}>
                  <Tags className="h-4.5 w-4.5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className={`flex flex-wrap items-center gap-2 ${highlightCaptionGuide ? "quick-note-heading-glow-primary" : ""}`}>
                    <span className={`${toneSyncClass} mediscan-primary-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${highlightCaptionGuide ? "quick-note-chip-glow-primary" : ""}`}>
                      {filters.guide.caption.label}
                    </span>
                    <h3 className={`${toneSyncClass} text-base font-bold text-title ${highlightCaptionGuide ? "quick-note-title-glow-primary" : ""}`}>
                      {filters.guide.caption.title}
                    </h3>
                  </div>
                  <p className={`${toneSyncClass} mediscan-primary-text mt-3 text-sm leading-7`}>
                    {filters.guide.caption.description}
                  </p>
                  <p className={`${toneSyncClass} mt-auto min-h-[3rem] pt-2 text-xs leading-6 text-muted`}>
                    {filters.guide.caption.note}
                  </p>
                </div>
              </article>

              <article className="flex h-full items-start gap-4">
                <div className={`${toneSyncClass} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/18 bg-accent-pale text-accent ${highlightScoreGuide ? "quick-note-icon-glow-accent" : ""}`}>
                  <BadgePercent className="h-4.5 w-4.5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className={`flex flex-wrap items-center gap-2 ${highlightScoreGuide ? "quick-note-heading-glow-accent" : ""}`}>
                    <span className={`${toneSyncClass} mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${highlightScoreGuide ? "quick-note-chip-glow-accent" : ""}`}>
                      {filters.guide.score.label}
                    </span>
                    <h3 className={`${toneSyncClass} text-base font-bold text-title ${highlightScoreGuide ? "quick-note-title-glow-accent" : ""}`}>
                      {filters.guide.score.title}
                    </h3>
                  </div>
                  <p className={`${toneSyncClass} mediscan-accent-text mt-3 text-sm leading-7`}>
                    {filters.guide.score.description}
                  </p>
                  <p className={`${toneSyncClass} mt-auto min-h-[3rem] pt-2 text-xs leading-6 text-muted`}>
                    {filters.guide.score.note}
                  </p>
                </div>
              </article>

              <article className="flex h-full items-start gap-4">
                <div className={`${toneSyncClass} mediscan-primary-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${highlightRelaunchGuide ? "quick-note-icon-glow-primary" : ""}`}>
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className={`flex flex-wrap items-center gap-2 ${highlightRelaunchGuide ? "quick-note-heading-glow-primary" : ""}`}>
                    <span className={`${toneSyncClass} mediscan-primary-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${highlightRelaunchGuide ? "quick-note-chip-glow-primary" : ""}`}>
                      {content.image.selectionGuide.label}
                    </span>
                    <h3 className={`${toneSyncClass} text-base font-bold text-title ${highlightRelaunchGuide ? "quick-note-title-glow-primary" : ""}`}>
                      {content.image.selectionGuide.title}
                    </h3>
                  </div>
                  <p className={`${toneSyncClass} mediscan-primary-text mt-3 text-sm leading-7`}>
                    {content.image.selectionGuide.description}
                  </p>
                  <p className={`${toneSyncClass} mt-auto min-h-[3rem] pt-2 text-xs leading-6 text-muted`}>
                    {content.image.selectionGuide.note}
                  </p>
                </div>
              </article>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
