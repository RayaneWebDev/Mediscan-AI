import { useState } from "react";
import { fetchConclusion } from "../api";
import { marked } from "marked";

export default function ClinicalConclusion({ searchResult, isAccent = false }) {
  const [conclusion, setConclusion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const accentColor = isAccent ? "text-accent border-accent/30 bg-accent/5" : "text-primary border-primary/30 bg-primary/5";
  const btnColor = isAccent
    ? "bg-accent hover:bg-accent/90 text-white"
    : "bg-primary hover:bg-primary/90 text-white";

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setOpen(true);
    try {
      const data = await fetchConclusion(searchResult);
      setConclusion(data.conclusion);
    } catch (err) {
      setError("Impossible de générer la conclusion. Vérifiez la configuration de l'API.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (conclusion) navigator.clipboard.writeText(conclusion);
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            className={isAccent ? "text-accent" : "text-primary"}>
            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/>
            <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/>
            <circle cx="20" cy="10" r="2"/>
          </svg>
          <span className="font-semibold text-text text-sm">Analyse IA</span>
        </div>
        <div className="flex items-center gap-2">
          {conclusion && (
            <button onClick={handleCopy} className="p-1.5 rounded-lg border border-border text-muted hover:text-text hover:border-border/80 transition-all" title="Copier">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
              </svg>
            </button>
          )}
          <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg border border-border text-muted hover:text-text transition-all" title={open ? "Réduire" : "Développer"}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="px-5 py-4">
          <div className={`flex gap-2 items-start text-xs rounded-xl px-3 py-2.5 mb-4 border ${accentColor}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Outil d'aide à la décision uniquement — ne remplace pas un diagnostic médical.</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {searchResult?.results?.slice(0, 5).map((r, i) => (
              <span key={i} className="text-[11px] px-2 py-1 rounded-lg bg-bg border border-border text-muted font-mono">
                #{r.rank} {r.score.toFixed(3)}
              </span>
            ))}
          </div>
          {!conclusion && !loading && (
            <button onClick={handleGenerate} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${btnColor}`}>
              Générer la conclusion
            </button>
          )}
          {loading && (
            <div className="flex items-center gap-3 py-4">
              <div className={`animate-spin h-5 w-5 border-2 border-b-transparent rounded-full ${isAccent ? "border-accent" : "border-primary"}`}/>
              <span className="text-sm text-muted">Analyse en cours…</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-danger bg-danger/5 border border-danger/20 rounded-xl px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}
          {conclusion && (
            <div className="mt-1">
              <div className="prose prose-sm max-w-none text-xs" dangerouslySetInnerHTML={{ __html: marked(conclusion) }} />
              <button onClick={() => { setConclusion(null); setError(null); }} className="mt-3 text-xs text-muted hover:text-text underline underline-offset-2 transition-colors">
                Régénérer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
