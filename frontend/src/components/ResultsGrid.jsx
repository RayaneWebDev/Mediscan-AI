/** 
 * @fileoverview Grille de résultats CBIR avec pagination, sélection, export et modales détail/comparaison.
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

/** Durée en ms de la transition de fermeture de la modale détail. */
const DETAIL_MODAL_TRANSITION_MS = 420;
/** Durée en ms de la transition du panneau de la modale détail. */
const DETAIL_MODAL_PANEL_TRANSITION_MS = 520;
/** Courbe d'animation du fond de la modale détail. */
const DETAIL_MODAL_BACKDROP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Courbe d'animation du panneau de la modale détail. */
const DETAIL_MODAL_PANEL_EASE = "cubic-bezier(0.19, 1, 0.22, 1)";
/** Durée en ms de la transition de la modale de comparaison. */
const COMPARE_MODAL_TRANSITION_MS = 320;
/** Nombre de résultats affichés par page dans la grille. */
const RESULTS_PER_PAGE = 6;
/** Classe CSS ajoutée au body quand une modale est ouverte (verrouillage du scroll). */
const BODY_MODAL_LOCK_CLASS = "search-modal-open";
/** Attribut HTML comptant le nombre de modales ouvertes simultanément. */
const BODY_MODAL_LOCK_COUNT_ATTR = "data-search-modal-open-count";

/**
 * Verrouille le scroll global du document lors de l'ouverture d'une modale.
 * Utilise un compteur pour gérer les ouvertures multiples simultanées.
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
 * Déverrouille le scroll global du document à la fermeture d'une modale.
 * Ne retire la classe que si toutes les modales sont fermées (compteur à 0).
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
 * Normalise une valeur CUI (identifiant de concept médical) en chaîne lisible.
 *
 * @param {string|string[]} cui - Valeur CUI brute (chaîne ou tableau).
 * @returns {string} CUI normalisé.
 */
function formatCuiValue(cui) {
  if (Array.isArray(cui)) {
    return cui.filter(Boolean).join(", ");
  }
  return typeof cui === "string" ? cui.trim() : "";
}

/**
 * Limite une valeur numérique dans un intervalle [min, max].
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
 * Assigne un nœud DOM à une ref externe (objet ou fonction).
 *
 * @param {React.Ref|function|null} externalRef - Ref externe.
 * @param {HTMLElement|null} node - Nœud DOM à assigner.
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
 * Retourne l'URL de l'image d'un résultat (chemin direct ou URL via API).
 *
 * @param {{path?: string, image_id?: string}} result - Résultat CBIR.
 * @returns {string} URL de l'image.
 */
function getResultImageSrc(result) {
  return result.path || imageUrl(result.image_id);
}

/**
 * Modale de détail d'un résultat CBIR.
 * Affiche l'image en grand avec ses métadonnées (score, CUI, caption, référence).
 * Supporte le téléchargement de l'image et la navigation clavier (Escape pour fermer).
 * Animation d'entrée depuis la position de la carte source (origin animation).
 *
 * @component
 * @param {object} props
 * @param {object} props.result - Résultat CBIR à afficher.
 * @param {DOMRect|null} props.originRect - Rectangle de la carte source pour l'animation d'entrée.
 * @param {"primary"|"accent"} props.tone - Ton de couleur de la modale.
 * @param {string} props.modeLabel - Libellé du mode de recherche.
 * @param {object} props.content - Traductions de la section résultats.
 * @param {function(): void} props.onClose - Callback de fermeture de la modale.
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
   * Télécharge l'image du résultat via fetch + création d'un lien temporaire.
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

  // Animation d'entrée depuis la position de la carte source
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

  // Fermeture au clavier (Escape) + verrouillage du scroll du body
  useEffect(() => {
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
 * Modale de comparaison côte à côte entre l'image requête et un résultat CBIR.
 *
 * @component
 * @param {object} props
 * @param {object} props.result - Résultat CBIR à comparer.
 * @param {{src: string, alt?: string}} props.comparisonSource - Image source de la requête.
 * @param {DOMRect|null} props.originRect - Rectangle de la carte source pour l'animation.
 * @param {"primary"|"accent"} props.tone - Ton de couleur.
 * @param {object} props.content - Traductions de la section résultats.
 * @param {function(): void} props.onClose - Callback de fermeture.
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
 * Grille paginée de résultats CBIR avec sélection, export et modales interactives.
 *
 * Fonctionnalités :
 * - Pagination automatique par blocs de 6 résultats.
 * - Sélection de résultats pour relance de recherche.
 * - Export des résultats en JSON, CSV et PDF.
 * - Modale détail avec animation depuis la carte source.
 * - Modale de comparaison côte à côte avec l'image requête.
 *
 * @component
 * @param {object} props
 * @param {object|null} props.data - Données de résultats CBIR. Structure : { mode, results, onRelaunch, onRelaunchMultiple }.
 * @param {boolean} [props.useHomeVisualTone=false] - Utilise le thème primary de la home page.
 * @param {string} [props.className="mt-8"] - Classes CSS supplémentaires.
 * @param {boolean} [props.headerHiddenOnDesktop=false] - Masque le header sur desktop.
 * @param {boolean} [props.animateOnMount=false] - Active les animations d'entrée des cartes.
 * @param {string[]} [props.selectedIds] - IDs sélectionnés (mode contrôlé).
 * @param {function(string[]): void} [props.onSelectedIdsChange] - Callback de changement de sélection (mode contrôlé).
 * @param {{src: string, alt?: string}|null} [props.comparisonSource=null] - Source de comparaison pour les modales.
 * @param {React.Ref} [props.cardsGridExternalRef=null] - Ref externe sur la grille de cartes.
 * @param {string} [props.desktopLockedHeightClass=""] - Classe CSS de hauteur verrouillée sur desktop.
 * @param {boolean} [props.desktopThreeColumns=false] - Force 3 colonnes sur desktop (sinon 2 ou 3 selon breakpoint).
 * @param {function(): void|null} [props.onExportJson=null] - Callback d'export JSON.
 * @param {function(): void|null} [props.onExportCsv=null] - Callback d'export CSV.
 * @param {function(): Promise<void>|null} [props.onExportPdf=null] - Callback d'export PDF (async).
 * @returns {JSX.Element|null} Null si "data" est null.
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

  // Réinitialise la page courante au changement de résultats ou de mode
  useEffect(() => {
    setCurrentPage(1);
  }, [resultRows, dataMode]);

  // Assure que la page courante ne dépasse pas le nombre total de pages
  useEffect(() => {
    setCurrentPage((previousPage) => Math.min(previousPage, totalPages));
  }, [totalPages]);

  if (!data) return null;

  
  /**
   * Met à jour les IDs sélectionnés (mode contrôlé ou local).
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
   * Bascule la sélection d'un résultat par son ID image.
   * @param {string} imageId
  */
  function handleToggleSelect(imageId) {
    updateSelectedIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  }

  /**
   * Ouvre la modale de détail pour un résultat.
   * @param {object} result
   * @param {DOMRect} originRect
  */
  function handleOpenDetails(result, originRect) {
    setDetailState({ result, originRect });
  }

  /**
   * Ouvre la modale de comparaison pour un résultat.
   * @param {object} result
   * @param {DOMRect} originRect
  */
  function handleOpenCompare(result, originRect) {
    if (!comparisonSource?.src) return;
    setCompareState({ result, originRect });
  }

  /**
   * Navigue vers une page de la grille.
   * @param {number} nextPage
  */
  function handlePageChange(nextPage) {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    if (safePage === currentPage) return;

    setCurrentPage(safePage);
  }

  /**
   * Assigne la ref interne de la grille et la ref externe si fournie.
   * @param {HTMLElement|null} node
  */
  function handleCardsGridRef(node) {
    assignExternalRef(cardsGridExternalRef, node);
  }

  /**
   * Déclenche un export dans le format spécifié et gère l'état de chargement.
   * @param {"json"|"csv"|"pdf"} format - Format d'export.
   * @param {function|null} exportAction - Fonction d'export à appeler.
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

      {/* Modale détail */}
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

      {/* Modale comparaison */}
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
