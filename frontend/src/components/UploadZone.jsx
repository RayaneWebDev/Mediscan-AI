import { useState, useRef } from "react";

export default function UploadZone({ file, onFileSelect, onRemove }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  }

  function handleChange(e) {
    if (e.target.files[0]) onFileSelect(e.target.files[0]);
  }

  if (file) {
    return (
      <div className="flex justify-center mt-4 self-start">
        <div className="relative rounded-2xl overflow-hidden shadow-md border border-border bg-surface">
          <img
            src={URL.createObjectURL(file)}
            alt="Apercu"
            className="block max-w-[260px] max-h-[260px] object-contain"
          />
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface/90 hover:bg-red-500 hover:text-white text-muted text-lg flex items-center justify-center transition-all shadow cursor-pointer border border-border backdrop-blur-sm"
          >
            &times;
          </button>
          <div className="px-3 py-2 bg-surface border-t border-border">
            <p className="text-xs text-muted truncate font-mono">{file.name}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
        ${dragOver
          ? "border-accent bg-accent-pale"
          : "border-border hover:border-accent hover:bg-accent-pale/50 bg-surface"
        }`}
    >
      <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-colors
        ${dragOver ? "bg-accent text-white" : "bg-primary-pale text-primary"}`}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className="text-text font-medium">
        Glissez une image ici ou{" "}
        <span className="text-primary font-semibold underline underline-offset-2">parcourir</span>
      </p>
      <p className="text-muted text-xs mt-1.5">JPEG ou PNG uniquement</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
