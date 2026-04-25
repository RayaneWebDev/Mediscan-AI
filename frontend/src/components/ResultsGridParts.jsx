/** 
 * @fileoverview Sous-composants de la grille de résultats CBIR.
 * @module components/ResultsGridParts
 */

import { useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeftRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { imageUrl } from "../api";
import { similarityScoreToPercent } from "../utils/searchResults";

/**
 * Ligne de métadonnée label/valeur dans la modale détail.
 * Retourne null si value est vide.
 */
function DetailItem({ label, value, mono = false, className = "" }) {
  if (!value) return null;

  return (
    <div className={`search-modal-panel rounded-[1.3rem] px-4 py-3 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p className={`mt-2 text-sm text-text ${mono ? "font-mono break-all" : "leading-6"}`}>
        {value}
      </p>
    </div>
  );
}

/**
 * Retourne les classes CSS d'une carte résultat selon le ton et le thème home.
 * @param {"primary"|"accent"} tone
 * @param {boolean} useHomeVisualTone
 * @returns {{shell: string, selected: string, rank: string, checkbox: string, checkboxHover: string}}
 */
function getCardClasses(tone, useHomeVisualTone) {
  if (tone === "accent") {
    return {
      shell: "mediscan-accent-surface",
      selected: "mediscan-accent-selected",
      rank: "mediscan-accent-chip search-result-rank-accent",
      checkbox: "border mediscan-accent-chip",
      checkboxHover: "hover:border-accent/30",
    };
  }

  return {
    shell: useHomeVisualTone ? "mediscan-primary-surface" : "",
    selected: useHomeVisualTone ? "mediscan-primary-selected" : "border-primary/50 ring-1 ring-primary/20",
    rank: useHomeVisualTone ? "mediscan-primary-chip" : "bg-primary-pale text-primary",
    checkbox: useHomeVisualTone ? "border mediscan-primary-chip" : "bg-primary-pale border-primary/50",
    checkboxHover: useHomeVisualTone ? "hover:border-primary/30" : "hover:border-primary/50",
  };
}

/**
 * Barre de score visuelle avec pourcentage et couleur adaptative.
 * @param {{score: number, tone: "primary"|"accent"}} props
 */
function ScoreBar({ score, tone }) {
  const pct = similarityScoreToPercent(score);
  const color = tone === "accent"
    ? (pct >= 70 ? "bg-accent/70" : pct >= 40 ? "bg-accent/35" : "bg-border")
    : null;
  const fillStyle = tone === "accent"
    ? { width: `${pct}%` }
    : {
        width: `${pct}%`,
        backgroundColor:
          pct >= 70
            ? "var(--search-primary-base, var(--theme-primary))"
            : pct >= 40
              ? "color-mix(in srgb, var(--search-primary-base, var(--theme-primary)) 36%, white 64%)"
              : "var(--color-border)",
      };

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted">Score</span>
        <span className="text-xs font-bold text-text">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full transition-all ${color ?? ""}`} style={fillStyle} />
      </div>
    </div>
  );
}

/**
 * Carte individuelle d'un résultat CBIR.
 * Gère le fallback image, la sélection, l'ouverture détail et comparaison.
 *
 * @param {object} props
 * @param {object} props.result - Résultat CBIR
 * @param {boolean} props.selected - Carte sélectionnée ou non
 * @param {function|null} props.onToggleSelect - Callback de sélection, null si désactivé
 * @param {function} props.onOpenDetails - Ouvre la modale détail
 * @param {function|null} props.onOpenCompare - Ouvre la modale comparaison, null si désactivé
 * @param {object} props.content - Traductions
 * @param {"primary"|"accent"} props.tone
 * @param {number} [props.entryIndex=0] - Index pour le délai d'animation
 * @param {boolean} [props.animateOnMount=false]
 * @param {boolean} [props.useHomeVisualTone=false]
 * @param {{src: string, alt?: string}|null} [props.comparisonSource=null]
 */
function ResultCard({
  result,
  selected,
  onToggleSelect,
  onOpenDetails,
  onOpenCompare,
  content,
  tone,
  entryIndex = 0,
  animateOnMount = false,
  useHomeVisualTone = false,
  comparisonSource = null,
}) {
  const previewRef = useRef(null);
  const directImageSrc = result.path || "";
  const proxiedImageSrc = imageUrl(result.image_id);
  const [currentImageSrc, setCurrentImageSrc] = useState(directImageSrc || proxiedImageSrc);
  const [imageFailed, setImageFailed] = useState(false);
  const cardClasses = getCardClasses(tone, useHomeVisualTone);

  function handleImageError() {
    if (!imageFailed && directImageSrc && currentImageSrc !== proxiedImageSrc) {
      setCurrentImageSrc(proxiedImageSrc);
      return;
    }

    setImageFailed(true);
  }

  function handleOpenDetails() {
    const rect = previewRef.current?.getBoundingClientRect();
    if (rect) {
      onOpenDetails(result, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      return;
    }

    onOpenDetails(result, null);
  }

  function handleOpenCompare() {
    if (!onOpenCompare) return;

    const rect = previewRef.current?.getBoundingClientRect();
    if (rect) {
      onOpenCompare(result, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
      return;
    }

    onOpenCompare(result, null);
  }

  function handleCardKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleOpenDetails();
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpenDetails}
      onKeyDown={handleCardKeyDown}
      aria-label={content.openDetails}
      className={`search-result-card group flex h-full min-h-[24rem] cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface backdrop-blur-sm transition-all focus:outline-none ${
        tone === "accent"
          ? "focus:ring-2 focus:ring-accent/20"
          : useHomeVisualTone
            ? "search-result-focus-primary"
            : "focus:ring-2 focus:ring-primary/20"
      } ${animateOnMount ? "mediscan-results-card-enter" : ""} ${cardClasses.shell} ${selected ? cardClasses.selected : ""}`}
      style={animateOnMount ? { animationDelay: `${Math.min(entryIndex * 90, 360)}ms` } : undefined}
    >
      <div ref={previewRef} className="search-result-preview relative h-44 shrink-0 bg-bg sm:h-56">
        {imageFailed ? (
          <div className="flex h-full w-full items-center justify-center bg-bg px-4 text-center text-[11px] text-muted">
            Image indisponible
          </div>
        ) : (
          <img
            src={currentImageSrc}
            alt={result.image_id}
            loading="lazy"
            onError={handleImageError}
            className="h-full w-full object-contain"
          />
        )}

        <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm ${cardClasses.rank} ${useHomeVisualTone ? "search-result-rank-primary" : ""}`}>
          {result.rank}
        </span>

        {onToggleSelect && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect(result.image_id);
            }}
            onKeyDown={(event) => event.stopPropagation()}
            className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow transition-all ${
              selected ? cardClasses.checkbox : `bg-surface border-border ${cardClasses.checkboxHover}`
            }`}
          >
            {selected && (
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-3.5">
        <p
          className="search-result-caption min-h-0 flex-1 overflow-hidden text-xs leading-relaxed text-text"
          title={result.caption}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 6,
            WebkitBoxOrient: "vertical",
            textOverflow: "ellipsis",
          }}
        >
          {result.caption}
        </p>

        <div className="mt-auto pt-2">
          {comparisonSource && (
            <div className="mb-0.5 flex items-center justify-center">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleOpenCompare();
                }}
                onKeyDown={(event) => event.stopPropagation()}
                className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-[10px] font-medium text-muted transition-all duration-200 ${
                  tone === "accent"
                    ? "search-result-compare-button-accent bg-accent/5 hover:bg-accent/10 hover:text-accent"
                    : "search-result-compare-button-primary"
                }`}
                aria-label={content.compareAction}
                title={content.compareAction}
              >
                <ArrowLeftRight className="h-3 w-3" />
                <span>{content.compareAction}</span>
              </button>
            </div>
          )}

          <div className="-mt-1">
            <ScoreBar score={result.score} tone={tone} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Contrôles de pagination avec ellipsis pour les grandes listes.
 *
 * @component
 * @param {object} props
 * @param {number} props.currentPage
 * @param {number} props.totalPages
 * @param {function(number): void} props.onPageChange
 * @param {object} props.content - Traductions
 * @param {"primary"|"accent"} props.tone
 * @param {boolean} [props.useHomeVisualTone=false]
 * @param {boolean} [props.showPageSummary=true]
 */
export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  content,
  tone,
  useHomeVisualTone = false,
  showPageSummary = true,
}) {
  const isSinglePage = totalPages <= 1;
  const inactiveButtonClass = tone === "accent"
    ? "mediscan-accent-outline-button search-results-pagination-button-accent"
    : useHomeVisualTone
      ? "mediscan-primary-outline-button search-results-pagination-button-primary"
      : "border-primary/20 bg-primary/6 text-primary hover:border-primary/28 hover:bg-primary/10";
  const activeButtonClass = tone === "accent"
    ? "mediscan-accent-chip search-results-pagination-button-active-accent shadow-sm"
    : useHomeVisualTone
      ? "mediscan-primary-chip search-results-pagination-button-active-primary shadow-sm"
      : "border border-primary/20 bg-primary-pale text-primary shadow-sm";
  const pageTokens = (() => {
    if (totalPages <= 8) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const tokens = [1];
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) tokens.push("ellipsis-left");
    for (let page = start; page <= end; page += 1) {
      tokens.push(page);
    }
    if (end < totalPages - 1) tokens.push("ellipsis-right");

    tokens.push(totalPages);
    return tokens;
  })();

  return (
    <nav className="inline-flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center" aria-label={content.paginationLabel}>
      {showPageSummary ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {content.pageLabel} {currentPage} / {totalPages}
        </p>
      ) : (
        <div aria-hidden="true" className="hidden sm:block" />
      )}

      <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label={content.previousPage}
          title={content.previousPage}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${inactiveButtonClass}`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pageTokens.map((token) => {
          if (typeof token !== "number") {
            return (
              <span
                key={token}
                aria-hidden="true"
                className="inline-flex h-9 w-9 items-center justify-center text-xs font-bold text-muted"
              >
                ...
              </span>
            );
          }

          const isActive = token === currentPage;

          return (
            <button
              type="button"
              key={token}
              onClick={() => onPageChange(token)}
              disabled={isSinglePage}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                isActive ? activeButtonClass : inactiveButtonClass
              } ${isSinglePage ? "cursor-default opacity-65" : ""}`}
            >
              {token}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label={content.nextPage}
          title={content.nextPage}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${inactiveButtonClass}`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}

/**
 * Bouton d'export avec état de chargement.
 * @param {{label: string, isLoading: boolean, disabled: boolean, onClick: function, className: string}} props
 */
function ExportButton({ label, isLoading, disabled, onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
    >
      {isLoading ? `${label}...` : label}
    </button>
  );
}

/**
 * En-tête de la grille : nombre de résultats et badge de mode.
 *
 * @component
 * @param {object} props
 * @param {number} props.resultCount
 * @param {object} props.content - Traductions
 * @param {string} props.modeLabel
 * @param {string} props.modeColor - Classes CSS du badge de mode
 * @param {boolean} [props.headerHiddenOnDesktop=false]
 */
export function ResultsGridHeader({
  resultCount,
  content,
  modeLabel,
  modeColor,
  headerHiddenOnDesktop = false,
}) {
  return (
    <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${headerHiddenOnDesktop ? "lg:hidden" : ""}`}>
      <h2 className="text-lg font-bold text-title">
        {resultCount} {resultCount > 1 ? content.resultsFoundPlural : content.resultsFoundSingular}
      </h2>
      <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${modeColor}`}>
        {modeLabel}
      </span>
    </div>
  );
}

/**
 * Barre d'outils de la grille : pagination et boutons d'export.
 *
 * @component
 * @param {object} props
 * @param {number} props.currentPage
 * @param {number} props.totalPages
 * @param {function(number): void} props.onPageChange
 * @param {object} props.content - Traductions
 * @param {"primary"|"accent"} props.tone
 * @param {boolean} [props.useHomeVisualTone=false]
 * @param {string} props.exportLabel
 * @param {boolean} props.exportDisabled
 * @param {string} props.exportButtonClass
 * @param {"json"|"csv"|"pdf"|null} props.activeExport - Format d'export en cours
 * @param {function} props.onExportJson
 * @param {function} props.onExportCsv
 * @param {function} props.onExportPdf
 */
export function ResultsGridToolbar({
  currentPage,
  totalPages,
  onPageChange,
  content,
  tone,
  useHomeVisualTone = false,
  exportLabel,
  exportDisabled,
  exportButtonClass,
  activeExport,
  onExportJson,
  onExportCsv,
  onExportPdf,
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-4">
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        content={content}
        tone={tone}
        useHomeVisualTone={useHomeVisualTone}
      />

      <div className="flex max-w-full flex-wrap items-center gap-2 md:justify-end md:pl-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {exportLabel}
        </span>
        <ExportButton
          label="JSON"
          isLoading={false}
          disabled={exportDisabled || !onExportJson}
          onClick={onExportJson}
          className={exportButtonClass}
        />
        <ExportButton
          label="CSV"
          isLoading={false}
          disabled={exportDisabled || !onExportCsv}
          onClick={onExportCsv}
          className={exportButtonClass}
        />
        <ExportButton
          label="PDF"
          isLoading={activeExport === "pdf"}
          disabled={exportDisabled || !onExportPdf}
          onClick={onExportPdf}
          className={exportButtonClass}
        />
      </div>
    </div>
  );
}

/**
 * Grille de cartes résultats avec placeholders desktop pour aligner la hauteur.
 *
 * @component
 * @param {object} props
 * @param {object[]} props.results - Page courante de résultats
 * @param {string[]} props.selectedIds
 * @param {function|null} props.onToggleSelect
 * @param {function} props.onOpenDetails
 * @param {function|null} props.onOpenCompare
 * @param {object} props.content - Traductions
 * @param {"primary"|"accent"} props.tone
 * @param {boolean} [props.animateOnMount=false]
 * @param {boolean} [props.useHomeVisualTone=false]
 * @param {{src: string}|null} [props.comparisonSource=null]
 * @param {number} [props.desktopPlaceholderCount=0]
 * @param {string} [props.desktopLockedHeightClass=""]
 * @param {boolean} [props.desktopThreeColumns=false]
 * @param {function} props.onGridRef - Callback ref sur le conteneur
 */
export function ResultsGridCards({
  results,
  selectedIds,
  onToggleSelect,
  onOpenDetails,
  onOpenCompare,
  content,
  tone,
  animateOnMount = false,
  useHomeVisualTone = false,
  comparisonSource = null,
  desktopPlaceholderCount = 0,
  desktopLockedHeightClass = "",
  desktopThreeColumns = false,
  onGridRef,
}) {
  return (
    <div
      ref={onGridRef}
      className={`mb-8 grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 ${
        desktopThreeColumns ? "lg:grid-cols-3" : "xl:grid-cols-3"
      } ${desktopLockedHeightClass ? "lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1" : "lg:min-h-[49rem]"}`}
    >
      {results.map((result, index) => (
        <ResultCard
          key={result.image_id}
          result={result}
          selected={selectedIds.includes(result.image_id)}
          onToggleSelect={onToggleSelect}
          onOpenDetails={onOpenDetails}
          onOpenCompare={comparisonSource?.src ? onOpenCompare : null}
          content={content}
          tone={tone}
          entryIndex={index}
          animateOnMount={animateOnMount}
          useHomeVisualTone={useHomeVisualTone}
          comparisonSource={comparisonSource}
        />
      ))}

      {Array.from({ length: desktopPlaceholderCount }, (_, index) => (
        <div
          key={`desktop-placeholder-${index}`}
          aria-hidden="true"
          className="pointer-events-none hidden min-h-[24rem] rounded-2xl border border-transparent opacity-0 lg:block"
        />
      ))}
    </div>
  );
}

/**
 * Vue de la modale détail (rendu pur, sans logique).
 * Utilisée via createPortal dans ResultDetailsModal.
 *
 * @component
 * @param {object} props
 * @param {React.Ref} props.modalRef
 * @param {object} props.backdropStyle - Style inline du fond
 * @param {object} props.panelStyle - Style inline du panneau (animation)
 * @param {"primary"|"accent"} props.tone
 * @param {string} props.modeLabel
 * @param {object} props.content - Traductions
 * @param {object} props.result
 * @param {string} props.imageSrc
 * @param {string} props.cuiValue
 * @param {string} props.scorePercent
 * @param {boolean} props.downloadPending
 * @param {function} props.onRequestClose
 * @param {function} props.onDownloadImage
 */
export function ResultDetailsModalView({
  modalRef,
  backdropStyle,
  panelStyle,
  tone,
  modeLabel,
  content,
  result,
  imageSrc,
  cuiValue,
  scorePercent,
  downloadPending,
  onRequestClose,
  onDownloadImage,
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label={content.detailsTitle}
      onClick={onRequestClose}
      style={backdropStyle}
    >
      <div
        ref={modalRef}
        className={`search-detail-modal search-detail-modal-${tone} relative flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[1.75rem] sm:max-h-[92vh] lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]`}
        onClick={(event) => event.stopPropagation()}
        style={panelStyle}
      >
        <button
          type="button"
          onClick={onRequestClose}
          className="search-modal-close absolute right-4 top-4 z-55 flex h-10 w-10 items-center justify-center rounded-full transition-all"
          aria-label={content.closeDetails}
        >
          <X className="h-5 w-5" />
        </button>

        <div className={`search-detail-media search-detail-media-${tone} relative mx-4 mb-4 mt-12 flex min-h-[300px] items-center justify-center overflow-hidden rounded-[1.35rem] p-6 lg:mx-0 lg:mb-0 lg:mt-0 lg:min-h-[72vh] lg:rounded-none lg:p-8`}>
          <img
            src={imageSrc}
            alt={result.caption || result.image_id}
            className="search-detail-image relative z-10 max-h-[68vh] w-full rounded-[1.35rem] object-contain"
          />
        </div>

        <div className={`search-detail-content search-detail-content-${tone} flex max-h-[88vh] flex-col overflow-y-auto px-5 pb-8 pt-5 sm:max-h-[92vh] sm:px-6 lg:px-8 lg:pb-8 lg:pt-8`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tone === "accent" ? "mediscan-accent-chip" : "mediscan-primary-chip"}`}>
              {modeLabel}
            </span>
          </div>

          <h3 className="mt-5 text-2xl font-bold text-title sm:text-[1.9rem]">
            {content.detailsTitle}
          </h3>
          <p className="mt-2 text-sm font-medium text-muted">
            {result.image_id}
          </p>

          <div className="search-modal-panel mt-5 rounded-[1.25rem] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              {content.captionLabel}
            </p>
            <p className="mt-3 text-sm leading-7 text-text sm:text-[0.95rem]">
              {result.caption || content.noCaption}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DetailItem label={content.scoreLabel} value={scorePercent} />
            <DetailItem label={content.rankLabel} value={String(result.rank)} mono />
            <DetailItem label={content.identifierLabel} value={result.image_id} mono />
            <DetailItem label={content.cuiLabel} value={cuiValue || content.notAvailable} mono />
          </div>

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={onDownloadImage}
              disabled={downloadPending}
              className={`search-detail-download inline-flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                downloadPending ? "cursor-wait opacity-70" : ""
              } ${tone === "accent" ? "search-detail-download-accent text-white" : "search-detail-download-primary text-white"}`}
              aria-label={content.downloadImage}
              title={content.downloadImage}
            >
              <ArrowDownToLine className={`search-detail-download-icon h-4.5 w-4.5 ${downloadPending ? "animate-pulse" : ""}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Vue de la modale de comparaison (rendu pur, sans logique).
 * Utilisée via createPortal dans ResultCompareModal.
 *
 * @component
 * @param {object} props
 * @param {React.Ref} props.modalRef
 * @param {object} props.backdropStyle
 * @param {object} props.panelStyle
 * @param {"primary"|"accent"} props.tone
 * @param {object} props.content - Traductions
 * @param {object} props.result
 * @param {{src: string, alt?: string, meta?: string}} props.comparisonSource
 * @param {string} props.imageSrc
 * @param {string} props.cuiValue
 * @param {string} props.scorePercent
 * @param {function} props.onRequestClose
 */
export function ResultCompareModalView({
  modalRef,
  backdropStyle,
  panelStyle,
  tone,
  content,
  result,
  comparisonSource,
  imageSrc,
  cuiValue,
  scorePercent,
  onRequestClose,
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center px-4 pb-4 py-10 sm:pt-0 sm:py-6"
      role="dialog"
      aria-modal="true"
      aria-label={content.compareTitle}
      onClick={onRequestClose}
      style={backdropStyle}
    >
      <div
        ref={modalRef}
        className={`search-compare-modal search-compare-modal-${tone} relative flex max-h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-[1.75rem] sm:max-h-[92vh]`}
        onClick={(event) => event.stopPropagation()}
        style={panelStyle}
      >
        <button
          type="button"
          onClick={onRequestClose}
          className="search-modal-close absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full transition-all lg:right-4 lg:top-4"
          style={{ top: "env(safe-area-inset-top, 12px)", margin: "8px" }}
          aria-label={content.closeDetails}
        >
          <X className="h-5 w-5" />
        </button>

        <div className={`search-modal-banner search-compare-banner search-compare-banner-${tone} relative px-5 pb-4 pt-14 sm:px-6 sm:pb-5 sm:pt-5 lg:px-8 lg:py-6`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${tone === "accent" ? "mediscan-accent-chip" : "mediscan-primary-chip"}`}>
              {content.compareAction}
            </span>
            <span className={`search-modal-chip search-modal-chip-top search-modal-chip-top-${tone} inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted`}>
              {content.scoreLabel} {scorePercent}
            </span>
          </div>
          <h3 className="mt-4 text-2xl font-bold text-title sm:text-[1.9rem]">
            {content.compareTitle}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-8 lg:pt-8">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-start">
            <div className="search-modal-panel rounded-[1.5rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] lg:text-[10px] ${tone === "accent" ? "mediscan-accent-chip" : "mediscan-primary-chip"}`}>
                  {content.queryImageLabel}
                </span>
                {comparisonSource.meta && (
                  <span className={`search-compare-text-block search-compare-text-block-${tone} max-w-[60%] truncate rounded-[0.95rem] px-3 py-2 text-[11px] font-medium text-muted`}>
                    {comparisonSource.meta}
                  </span>
                )}
              </div>
              <div className={`search-compare-frame search-compare-text-block search-compare-text-block-${tone} search-compare-frame-${tone} relative mt-4 flex min-h-[160px] items-center justify-center overflow-hidden rounded-[1.25rem] p-5 sm:min-h-[300px]`}>
                <img
                  src={comparisonSource.src}
                  alt={comparisonSource.alt}
                  className="search-detail-image relative z-10 w-full max-h-[58vh] rounded-[1.15rem] object-contain"
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-col gap-5">
              <div className="search-modal-panel rounded-[1.5rem] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[8px] font-semibold uppercase tracking-[0.18em] lg:text-[10px] ${tone === "accent" ? "mediscan-accent-chip" : "mediscan-primary-chip"}`}>
                    {content.selectedImageLabel}
                  </span>
                  <span className={`search-compare-text-block search-compare-text-block-${tone} max-w-[60%] truncate rounded-[0.95rem] px-3 py-2 text-[11px] font-medium text-muted`}>
                    {result.image_id}
                  </span>
                </div>
                <div className={`search-compare-frame search-compare-text-block search-compare-text-block-${tone} search-compare-frame-${tone} relative mt-4 flex min-h-[300px] items-center justify-center overflow-hidden rounded-[1.25rem] p-5`}>
                  <img
                    src={imageSrc}
                    alt={result.caption || result.image_id}
                    className="search-detail-image relative z-10 w-full max-h-[58vh] rounded-[1.15rem] object-contain"
                  />
                </div>
              </div>

              <div className={`search-compare-text-block search-compare-text-block-${tone} inline-flex max-w-full items-center rounded-[1rem] px-4 py-3 text-[11px] font-medium text-text`}>
                {content.resultMetadataHint}
              </div>

              <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_repeat(2,minmax(0,0.8fr))]">
                <div className={`search-modal-panel search-compare-text-block search-compare-text-block-${tone} rounded-[1.35rem] p-5`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                    {content.resultCaptionLabel}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-text">
                    {result.caption || content.noCaption}
                  </p>
                </div>
                <DetailItem
                  label={content.resultScoreLabel}
                  value={scorePercent}
                  className={`search-compare-text-block search-compare-text-block-${tone}`}
                />
                <DetailItem
                  label={content.resultCuiLabel}
                  value={cuiValue || content.notAvailable}
                  mono
                  className={`search-compare-text-block search-compare-text-block-${tone}`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
