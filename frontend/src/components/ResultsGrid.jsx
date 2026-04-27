/**
 * @fileoverview Paginated result grid with selection, details, comparison, and exports.
 * @module components/ResultsGrid
 */

import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { imageUrl } from "../api";
import { LangContext } from "../context/LangContextValue";
import { similarityScoreToPercent } from "../utils/searchResults";
import {
  ResultCompareModalView,
  ResultDetailsModalView,
  ResultsGridCards,
  ResultsGridHeader,
  ResultsGridToolbar,
} from "./ResultsGridParts";

/** Detail modal close transition duration in milliseconds. */
const DETAIL_MODAL_TRANSITION_MS = 420;
/** Detail modal panel transition duration in milliseconds. */
const DETAIL_MODAL_PANEL_TRANSITION_MS = 520;
/** Detail modal backdrop animation curve. */
const DETAIL_MODAL_BACKDROP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Detail modal panel animation curve. */
const DETAIL_MODAL_PANEL_EASE = "cubic-bezier(0.19, 1, 0.22, 1)";
/** Compare modal transition duration in milliseconds. */
const COMPARE_MODAL_TRANSITION_MS = 320;
/** Number of results displayed per grid page. */
const RESULTS_PER_PAGE = 6;
/** CSS class added to the body while a modal locks scrolling. */
const BODY_MODAL_LOCK_CLASS = "search-modal-open";
/** HTML attribute that counts concurrently open modals. */
const BODY_MODAL_LOCK_COUNT_ATTR = "data-search-modal-open-count";

/**
 * Lock global navigation and page chrome while one or more result modals are open.
 */
function lockGlobalSearchModalUi() {
  if (typeof document === "undefined") return;

  const body = document.body;
  const currentCount = Number.parseInt(body.getAttribute(BODY_MODAL_LOCK_COUNT_ATTR) || "0", 10);
  const nextCount = Number.isNaN(currentCount) ? 1 : currentCount + 1;

  body.setAttribute(BODY_MODAL_LOCK_COUNT_ATTR, String(nextCount));
  body.classList.add(BODY_MODAL_LOCK_CLASS);
}

/**
 * Release one modal lock and restore global chrome when the last modal closes.
 */
function unlockGlobalSearchModalUi() {
  if (typeof document === "undefined") return;

  const body = document.body;
  const currentCount = Number.parseInt(body.getAttribute(BODY_MODAL_LOCK_COUNT_ATTR) || "0", 10);
  const nextCount = Number.isNaN(currentCount) ? 0 : Math.max(0, currentCount - 1);

  if (nextCount === 0) {
    body.removeAttribute(BODY_MODAL_LOCK_COUNT_ATTR);
    body.classList.remove(BODY_MODAL_LOCK_CLASS);
    return;
  }

  body.setAttribute(BODY_MODAL_LOCK_COUNT_ATTR, String(nextCount));
}

/**
 * Format CUI metadata for compact display in cards and modals.
 *
 * @param {string|string[]} cui
 * @returns {string}
 */
function formatCuiValue(cui) {
  if (Array.isArray(cui)) {
    return cui.filter(Boolean).join(", ");
  }
  return typeof cui === "string" ? cui.trim() : "";
}

/**
 * Clamp a numeric value into an inclusive range.
 *
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Assign a DOM node to either a callback ref or mutable object ref.
 *
 * @param {React.Ref|function|null} externalRef
 * @param {HTMLElement|null} node
 */
function assignExternalRef(externalRef, node) {
  if (!externalRef) return;

  if (typeof externalRef === "function") {
    externalRef(node);
    return;
  }

  externalRef.current = node;
}

/**
 * Resolve the best image source for a result row.
 *
 * @param {object} result
 * @returns {string}
 */
function getResultImageSrc(result) {
  return result.path || imageUrl(result.image_id);
}

/**
 * Display one result in the detail modal with an origin-aware entry animation.
 *
 * @component
 * @param {object} props
 * @param {object} props.result
 * @param {DOMRect|null} props.originRect
 * @param {"primary"|"accent"} props.tone
 * @param {string} props.modeLabel
 * @param {object} props.content
 * @param {function(): void} props.onClose
 * @returns {JSX.Element}
 */
function ResultDetailsModal({ result, originRect, tone, modeLabel, content, onClose }) {
  const imageSrc = getResultImageSrc(result);
  const cuiValue = formatCuiValue(result.cui);
  const scorePercent = `${similarityScoreToPercent(result.score)}%`;
  const modalRef = useRef(null);
  const closeTimerRef = useRef(null);
  const scrollYRef = useRef(0);
  const openFrameRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [downloadPending, setDownloadPending] = useState(false);
  const [entryTransform, setEntryTransform] = useState({
    x: 0,
    y: 26,
    scale: 0.965,
  });

  const requestClose = useCallback(() => {
    if (closeTimerRef.current) return;
    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, DETAIL_MODAL_TRANSITION_MS);
  }, [onClose]);

	  /**
	   * Download the currently displayed result image from its resolved URL.
	   *
	   * @param {React.MouseEvent} event
	  */
  async function handleDownloadImage(event) {
    event.stopPropagation();
    if (downloadPending) return;

    setDownloadPending(true);

    try {
      const response = await fetch(imageSrc);
      if (!response.ok) {
        throw new Error(`Unable to download image (${response.status})`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const extension = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${result.image_id || "mediscan-image"}.${extension}`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch {
      window.open(imageSrc, "_blank", "noopener,noreferrer");
    } finally {
      setDownloadPending(false);
    }
  }

  // Entry animation from the source card position
  useLayoutEffect(() => {
    if (!modalRef.current) return;

    if (!originRect) {
      openFrameRef.current = requestAnimationFrame(() => {
        setIsOpen(true);
      });
      return () => {
        cancelAnimationFrame(openFrameRef.current);
      };
    }

    const targetRect = modalRef.current.getBoundingClientRect();
    const sourceCenterX = originRect.left + (originRect.width / 2);
    const sourceCenterY = originRect.top + (originRect.height / 2);
    const targetCenterX = targetRect.left + (targetRect.width / 2);
    const targetCenterY = targetRect.top + (targetRect.height / 2);
    const sourceScale = Math.min(
      originRect.width / targetRect.width,
      originRect.height / targetRect.height,
    );

    setEntryTransform({
      x: sourceCenterX - targetCenterX,
      y: sourceCenterY - targetCenterY,
      scale: clamp(sourceScale, 0.2, 0.92),
    });

    openFrameRef.current = requestAnimationFrame(() => {
      setIsOpen(true);
    });

    return () => {
      cancelAnimationFrame(openFrameRef.current);
    };
  }, [originRect]);

  // Close on Escape and lock body scrolling while the modal is open.
  useEffect(() => {
    /**
     * Close the details modal from keyboard input.
     * @param {KeyboardEvent} event
     */
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    scrollYRef.current = window.scrollY;
    const previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    lockGlobalSearchModalUi();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      cancelAnimationFrame(openFrameRef.current);
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.left = previousBodyStyles.left;
      document.body.style.right = previousBodyStyles.right;
      document.body.style.width = previousBodyStyles.width;
      document.body.style.overflow = previousBodyStyles.overflow;
      unlockGlobalSearchModalUi();
      window.scrollTo(0, scrollYRef.current);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [requestClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <ResultDetailsModalView
      modalRef={modalRef}
      backdropStyle={{
        paddingTop: "max(24px, env(safe-area-inset-top))",
        backgroundColor: isOpen ? "rgba(6, 12, 21, 0.96)" : "rgba(6, 12, 21, 0)",
        transition: `background-color ${DETAIL_MODAL_TRANSITION_MS}ms ${DETAIL_MODAL_BACKDROP_EASE}`,
      }}
      panelStyle={{
        opacity: isOpen ? 1 : 0,
        transform: isOpen
          ? "translate3d(0px, 0px, 0px) scale(1)"
          : `translate3d(${entryTransform.x}px, ${entryTransform.y}px, 0px) scale(${entryTransform.scale})`,
        transition: `opacity ${DETAIL_MODAL_TRANSITION_MS}ms ${DETAIL_MODAL_PANEL_EASE}, transform ${DETAIL_MODAL_PANEL_TRANSITION_MS}ms ${DETAIL_MODAL_PANEL_EASE}`,
        transformOrigin: "center center",
        willChange: "opacity, transform",
      }}
      tone={tone}
      modeLabel={modeLabel}
      content={content}
      result={result}
      imageSrc={imageSrc}
      cuiValue={cuiValue}
      scorePercent={scorePercent}
      downloadPending={downloadPending}
      onRequestClose={requestClose}
      onDownloadImage={handleDownloadImage}
    />,
    document.body
  );
}

/**
 * Display a side-by-side comparison modal between the query image and one result.
 *
 * @component
 * @param {object} props
 * @param {object} props.result
 * @param {object} props.comparisonSource
 * @param {DOMRect|null} props.originRect
 * @param {"primary"|"accent"} props.tone
 * @param {object} props.content
 * @param {function(): void} props.onClose
 * @returns {JSX.Element}
 */
function ResultCompareModal({ result, comparisonSource, originRect, tone, content, onClose }) {
  const imageSrc = getResultImageSrc(result);
  const cuiValue = formatCuiValue(result.cui);
  const scorePercent = `${similarityScoreToPercent(result.score)}%`;
  const modalRef = useRef(null);
  const closeTimerRef = useRef(null);
  const scrollYRef = useRef(0);
  const openFrameRef = useRef(0);
  const [isOpen, setIsOpen] = useState(false);
  const [entryTransform, setEntryTransform] = useState({
    x: 0,
    y: 26,
    scale: 0.965,
  });

  const requestClose = useCallback(() => {
    if (closeTimerRef.current) return;
    setIsOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, COMPARE_MODAL_TRANSITION_MS);
  }, [onClose]);

  useLayoutEffect(() => {
    if (!modalRef.current) return;

    if (!originRect) {
      openFrameRef.current = requestAnimationFrame(() => {
        setIsOpen(true);
      });
      return () => {
        cancelAnimationFrame(openFrameRef.current);
      };
    }

    const targetRect = modalRef.current.getBoundingClientRect();
    const sourceCenterX = originRect.left + (originRect.width / 2);
    const sourceCenterY = originRect.top + (originRect.height / 2);
    const targetCenterX = targetRect.left + (targetRect.width / 2);
    const targetCenterY = targetRect.top + (targetRect.height / 2);
    const sourceScale = Math.min(
      originRect.width / targetRect.width,
      originRect.height / targetRect.height,
    );

    setEntryTransform({
      x: sourceCenterX - targetCenterX,
      y: sourceCenterY - targetCenterY,
      scale: clamp(sourceScale, 0.2, 0.92),
    });

    openFrameRef.current = requestAnimationFrame(() => {
      setIsOpen(true);
    });

    return () => {
      cancelAnimationFrame(openFrameRef.current);
    };
  }, [originRect]);

  useEffect(() => {
    /**
     * Close the comparison modal from keyboard input.
     * @param {KeyboardEvent} event
     */
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    scrollYRef.current = window.scrollY;
    const previousBodyStyles = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    lockGlobalSearchModalUi();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      cancelAnimationFrame(openFrameRef.current);
      document.body.style.position = previousBodyStyles.position;
      document.body.style.top = previousBodyStyles.top;
      document.body.style.left = previousBodyStyles.left;
      document.body.style.right = previousBodyStyles.right;
      document.body.style.width = previousBodyStyles.width;
      document.body.style.overflow = previousBodyStyles.overflow;
      unlockGlobalSearchModalUi();
      window.scrollTo(0, scrollYRef.current);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [requestClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <ResultCompareModalView
      modalRef={modalRef}
      backdropStyle={{
        backgroundColor: isOpen ? "rgba(6, 12, 21, 0.96)" : "rgba(6, 12, 21, 0)",
        transition: `background-color ${COMPARE_MODAL_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      }}
      panelStyle={{
        opacity: isOpen ? 1 : 0,
        transform: isOpen
          ? "translate3d(0px, 0px, 0px) scale(1)"
          : `translate3d(${entryTransform.x}px, ${entryTransform.y}px, 0px) scale(${entryTransform.scale})`,
        transition: `opacity ${COMPARE_MODAL_TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1), transform ${COMPARE_MODAL_TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        transformOrigin: "center center",
      }}
      tone={tone}
      content={content}
      result={result}
      comparisonSource={comparisonSource}
      imageSrc={imageSrc}
      cuiValue={cuiValue}
      scorePercent={scorePercent}
      onRequestClose={requestClose}
    />,
    document.body
  );
}

/**
 * Render the complete result grid surface.
 *
 * The grid handles pagination, controlled or local multi-selection, detail and
 * comparison modals, and export loading states while keeping result rows immutable.
 *
 * @component
 * @param {object} props
 * @param {object|null} props.data
 * @param {boolean} [props.useHomeVisualTone=false]
 * @param {string} [props.className="mt-8"]
 * @param {boolean} [props.headerHiddenOnDesktop=false]
 * @param {boolean} [props.animateOnMount=false]
 * @param {string[]} [props.selectedIds]
 * @param {function(string[]): void} [props.onSelectedIdsChange]
 * @param {object|null} [props.comparisonSource=null]
 * @param {React.Ref} [props.cardsGridExternalRef=null]
 * @param {string} [props.desktopLockedHeightClass=""]
 * @param {boolean} [props.desktopThreeColumns=false]
 * @param {function(): void|null} [props.onExportJson=null]
 * @param {function(): void|null} [props.onExportCsv=null]
 * @param {function(): Promise<void>|null} [props.onExportPdf=null]
 * @returns {JSX.Element|null}
 *
 */
export default function ResultsGrid({
  data,
  useHomeVisualTone = false,
  className = "mt-8",
  headerHiddenOnDesktop = false,
  animateOnMount = false,
  selectedIds: controlledSelectedIds,
  onSelectedIdsChange,
  comparisonSource = null,
  cardsGridExternalRef = null,
  desktopLockedHeightClass = "",
  desktopThreeColumns = false,
  onExportJson = null,
  onExportCsv = null,
  onExportPdf = null,
}) {
  const { t } = useContext(LangContext);
  const content = t.search.results;
  const exportLabel = t.search.filters.export;
  const [localSelectedIds, setLocalSelectedIds] = useState([]);
  const [detailState, setDetailState] = useState(null);
  const [compareState, setCompareState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeExport, setActiveExport] = useState(null);
  const resultRows = useMemo(() => data?.results ?? [], [data?.results]);
  const dataMode = data?.mode ?? null;
  const supportsSelectionSearch = typeof data?.onRelaunchMultiple === "function";
  const isSelectionControlled = Array.isArray(controlledSelectedIds) && typeof onSelectedIdsChange === "function";
  const selectedIds = isSelectionControlled ? controlledSelectedIds : localSelectedIds;
  const isVisual = dataMode === "visual";
  const tone = isVisual ? "primary" : "accent";
  const useHomePrimaryTone = useHomeVisualTone && isVisual;

  const modeLabel = isVisual
    ? content.visualMode
    : dataMode === "text"
      ? content.textMode
      : content.semanticMode;
  const modeColor = isVisual
    ? useHomePrimaryTone ? "border mediscan-primary-chip" : "bg-primary-pale text-primary border-primary/20"
    : "border mediscan-accent-chip";
  const exportDisabled = resultRows.length === 0 || Boolean(activeExport);
  const exportButtonClass = tone === "accent"
    ? "mediscan-accent-outline-button search-results-export-button-accent"
    : useHomePrimaryTone
      ? "mediscan-primary-outline-button search-results-export-button-primary"
      : "border-primary/20 bg-primary/6 text-primary hover:border-primary/28 hover:bg-primary/10";
  const totalPages = Math.max(1, Math.ceil(resultRows.length / RESULTS_PER_PAGE));
  const pageStartIndex = (currentPage - 1) * RESULTS_PER_PAGE;
  const paginatedResults = resultRows.slice(pageStartIndex, pageStartIndex + RESULTS_PER_PAGE);
  const desktopPlaceholderCount = Math.max(0, RESULTS_PER_PAGE - paginatedResults.length);

  // Reset the current page when results or mode change.
  useEffect(() => {
    setCurrentPage(1);
  }, [resultRows, dataMode]);

  // Ensure the current page does not exceed the total page count.
  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages));
  }, [totalPages]);

  if (!data) return null;


  /**
   * Update selected ids through the controlled API when available.
   * @param {string[]|function} updater
  */
  function updateSelectedIds(updater) {
    if (isSelectionControlled) {
      const nextSelectedIds = typeof updater === "function" ? updater(controlledSelectedIds) : updater;
      onSelectedIdsChange(nextSelectedIds);
      return;
    }

    setLocalSelectedIds(updater);
  }

  /**
   * Toggle one result id in the active selection.
   * @param {string} imageId
  */
  function handleToggleSelect(imageId) {
    updateSelectedIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  }

  /**
   * Open the detail modal from a result card and preserve its origin rect.
   * @param {object} result
   * @param {DOMRect} originRect
  */
  function handleOpenDetails(result, originRect) {
    setDetailState({ result, originRect });
  }

  /**
   * Open the visual comparison modal when a source image is available.
   * @param {object} result
   * @param {DOMRect} originRect
  */
  function handleOpenCompare(result, originRect) {
    if (!comparisonSource?.src) return;
    setCompareState({ result, originRect });
  }

  /**
   * Navigate to a safe page inside the result grid.
   * @param {number} nextPage
  */
  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safePage === currentPage) return;

    setCurrentPage(safePage);
  }

  /**
   * Assign the grid node to the external ref when one is provided.
   * @param {HTMLElement|null} node
  */
  function handleCardsGridRef(node) {
    assignExternalRef(cardsGridExternalRef, node);
  }

  /**
   * Run one export action while exposing which format is currently busy.
   * @param {"json"|"csv"|"pdf"} format
   * @param {function|null} exportAction
  */
  async function handleExportClick(format, exportAction) {
    if (!exportAction || activeExport) return;

    setActiveExport(format);
    try {
      await Promise.resolve(exportAction());
    } finally {
      setActiveExport(null);
    }
  }

  return (
    <section
      className={`${className} ${animateOnMount ? "mediscan-results-stage-enter" : ""} ${desktopLockedHeightClass ? `lg:flex lg:flex-col ${desktopLockedHeightClass}` : ""}`}
    >
      <ResultsGridHeader
        resultCount={resultRows.length}
        content={content}
        modeLabel={modeLabel}
        modeColor={modeColor}
        headerHiddenOnDesktop={headerHiddenOnDesktop}
      />

      <ResultsGridToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        content={content}
        tone={tone}
        useHomeVisualTone={useHomePrimaryTone}
        exportLabel={exportLabel}
        exportDisabled={exportDisabled}
        exportButtonClass={exportButtonClass}
        activeExport={activeExport}
        onExportJson={() => handleExportClick("json", onExportJson)}
        onExportCsv={() => handleExportClick("csv", onExportCsv)}
        onExportPdf={() => handleExportClick("pdf", onExportPdf)}
      />

      <ResultsGridCards
        results={paginatedResults}
        selectedIds={selectedIds}
        onToggleSelect={supportsSelectionSearch ? handleToggleSelect : null}
        onOpenDetails={handleOpenDetails}
        onOpenCompare={comparisonSource?.src ? handleOpenCompare : null}
        content={content}
        tone={tone}
        animateOnMount={animateOnMount}
        useHomeVisualTone={useHomePrimaryTone}
        comparisonSource={comparisonSource}
        desktopPlaceholderCount={desktopPlaceholderCount}
        desktopLockedHeightClass={desktopLockedHeightClass}
        desktopThreeColumns={desktopThreeColumns}
        onGridRef={handleCardsGridRef}
      />

      {/* Detail modal */}
      {detailState && (
        <ResultDetailsModal
          result={detailState.result}
          originRect={detailState.originRect}
          tone={tone}
          modeLabel={modeLabel}
          content={content}
          onClose={() => setDetailState(null)}
        />
      )}

      {/* Compare modal */}
      {compareState && comparisonSource?.src && (
        <ResultCompareModal
          result={compareState.result}
          comparisonSource={comparisonSource}
          originRect={compareState.originRect}
          tone={tone}
          content={content}
          onClose={() => setCompareState(null)}
        />
      )}
    </section>
  );
}
