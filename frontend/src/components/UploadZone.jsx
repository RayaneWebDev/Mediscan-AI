/** 
 * @fileoverview Zone de dépôt et de sélection d'image pour la recherche CBIR par image.
 * @module components/UploadZone
 */

import { useContext, useEffect, useId, useMemo, useRef, useState, useCallback } from "react";
import { LangContext } from "../context/LangContextValue";

/**
 * Zone interactive pour sélectionner ou glisser-déposer une image (JPEG ou PNG).
 * Affiche une prévisualisation une fois le fichier sélectionné.
 *
 * @component
 * @param {object} props
 * @param {File|null} props.file - Fichier image sélectionné, null si aucun
 * @param {function(File): void} props.onFileSelect - Appelé quand un fichier est choisi
 * @param {function(): void} props.onRemove - Appelé quand l'utilisateur supprime l'image
 * @param {boolean} [props.isAccent=false] - Palette accent (recherche sémantique)
 * @param {boolean} [props.useHomeVisualTone=false] - Thème visuel de la home page
 * @param {boolean} [props.fillHeight=false] - Étend la zone pour remplir la hauteur disponible
 * @param {boolean} [props.enableToneTransition=false] - Active les transitions de changement de ton
 * @returns {JSX.Element}
 */
export default function UploadZone({
  file,
  onFileSelect,
  onRemove,
  isAccent = false,
  useHomeVisualTone = false,
  fillHeight = false,
  enableToneTransition = false,
}) {
  const { t } = useContext(LangContext);
  const content = t.search.image;
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const inputId = useId();
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const toneSyncClass = enableToneTransition ? "search-tone-sync" : "";
  const uploadFrameClass = "w-full min-h-[15.5rem] sm:min-h-[17rem] lg:min-h-[20rem]";

  // Révocation de l'URL objet pour éviter les fuites mémoire
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const dropZoneColorClass = dragOver
    ? isAccent ? "border-accent bg-accent-pale" : "search-upload-dropzone-primary-drag"
    : isAccent ? "mediscan-accent-surface hover:border-accent/40"
    : useHomeVisualTone ? "mediscan-primary-surface hover:border-primary/40"
    : "border-border hover:border-primary hover:bg-primary-pale/50 bg-surface";

  const iconColorClass = dragOver
    ? isAccent ? "bg-accent-pale text-accent border border-accent/30" : "search-upload-icon-primary-drag border"
    : isAccent ? "mediscan-accent-chip search-upload-icon-panel-accent"
    : useHomeVisualTone ? "mediscan-primary-chip search-upload-icon-panel-primary"
    : "bg-primary-pale text-primary";

  /**
   * Gère le collage d'une image depuis le presse-papier (Ctrl+V).
  */
  const handlePaste = useCallback((e) => {
    // Accès aux données du presse-papier
    const clipboardItems = e.clipboardData?.items;
    if (!clipboardItems) return;

    const item = Array.from(clipboardItems).find(i => i.type.includes("image"));
    
    if (item) {
      const pastedFile = item.getAsFile();
      if (pastedFile) {
        onFileSelect(pastedFile);
      }
    }
  }, [onFileSelect]);

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);
  
  /**
   * Ouvre le sélecteur de fichier natif du navigateur.
  */
  function handleOpenFilePicker() {
    try {
      if (typeof inputRef.current?.showPicker === "function") {
        inputRef.current.showPicker();
        return;
      }
    } catch {
      // showPicker() non supporté ou exception → fallback
    }
    inputRef.current?.click();
  }

  /**
   * Gère le dépôt d'un fichier via drag & drop.
   * @param {DragEvent} e
  */
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  }

  /**
   * Gère la sélection via l'input natif.
   * Réinitialise la valeur pour permettre la re-sélection du même fichier.
   * @param {React.ChangeEvent<HTMLInputElement>} e
  */
  function handleChange(e) {
    const nextFile = e.target.files[0];
    e.target.value = "";
    if (nextFile) {
      onFileSelect(nextFile);
    }
  }

  return (
    <div className={`w-full ${file ? `mt-4 flex ${fillHeight ? "min-h-0 flex-1 items-stretch" : "items-stretch"}` : ""}`}>
      <label
        htmlFor={inputId}
        tabIndex={0}
        aria-label={content.uploadPrompt}
        translate="no"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenFilePicker();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`${file ? "hidden " : "flex "}${enableToneTransition ? "search-tone-transition " : ""}notranslate search-upload-dropzone ${uploadFrameClass} mt-3 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center
          ${fillHeight ? "flex-1" : ""}
          ${dropZoneColorClass}`}
      >
        <div className={`${enableToneTransition ? "search-tone-transition " : ""}search-upload-icon-badge w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${iconColorClass}`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <p className={`${toneSyncClass} text-sm text-text font-medium`} translate="no">
          <span>{content.uploadPrompt} </span>
          <span className={`${toneSyncClass} font-semibold underline underline-offset-2 ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-primary"}`}>
            {content.browseAction}
          </span>
        </p>
        <p className={`${toneSyncClass} text-muted text-[11px] mt-1`} translate="no">{content.acceptedFormats}</p>
      </label>
      <div className={`${file ? `flex w-full ${fillHeight ? "min-h-0 flex-1 items-stretch" : "items-stretch"}` : "hidden"}`}>
        <div className={`${enableToneTransition ? "search-tone-transition " : ""}search-upload-preview mediscan-upload-preview-enter relative flex ${uploadFrameClass} flex-col overflow-hidden rounded-2xl border shadow-md ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-primary/40"}`}>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-5 sm:px-5">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={content.previewAlt}
                className="block h-full max-h-[232px] w-full object-contain mediscan-upload-preview-image sm:max-h-[248px] lg:max-h-[268px]"
              />
            ) : null}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className={`${enableToneTransition ? "search-tone-transition " : ""}search-upload-remove absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border text-lg shadow backdrop-blur-sm transition-all cursor-pointer hover:bg-danger hover:text-on-strong ${
              isAccent
                ? "image-search-soft-control image-search-soft-control-accent"
                : useHomeVisualTone
                  ? "image-search-soft-control image-search-soft-control-primary"
                  : "bg-surface/90 text-muted border-border"
            }`}
          >
            &times;
          </button>
          <div
            className={`${enableToneTransition ? "search-tone-transition " : ""}search-upload-meta px-3 py-2 border-t ${
              isAccent
                ? "image-search-file-meta image-search-file-meta-accent"
                : useHomeVisualTone
                  ? "image-search-file-meta image-search-file-meta-primary"
                  : "bg-surface border-border"
            }`}
          >
            <p className={`${toneSyncClass} text-xs text-muted truncate font-mono`} translate="no">{file?.name || ""}</p>
          </div>
        </div>
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
