import { useState, useContext, useEffect } from "react";
import { LangContext } from "../context/lang-context";
import Controls from "./Controls";
import StatusBar from "./StatusBar";
import ResultsGrid from "./ResultsGrid";
import { searchText } from "../api";

export default function TextSearchView({ onBack, onChromeToneChange }) {
  const { t } = useContext(LangContext);
  const content = t.search.text;

  const [query, setQuery] = useState("");
  const [k, setK] = useState(5);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const [minScore, setMinScore] = useState(0);
  const [captionFilter, setCaptionFilter] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");

  function filterResults(data) {
    if (!data || !data.results) return null;
    const filtered = data.results
      .filter((r) => r.score >= minScore)
      .filter((r) => r.caption.toLowerCase().includes(captionFilter.toLowerCase()))
      .sort((a, b) => sortOrder === "desc" ? b.score - a.score : a.score - b.score);
    return { ...data, results: filtered };
  }

  useEffect(() => {
    onChromeToneChange?.("accent");
  }, [onChromeToneChange]);

  async function handleSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setStatus({ type: "loading", message: content.searching });
    setResults(null);

    try {
      const data = await searchText(trimmed, k);
      setResults(data);
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

  function exportJSON() {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "results_text.json";
    a.click();
  }

  function exportCSV() {
    if (!results) return;
    const actualResults = Array.isArray(results) ? results : results.results;
    const headers = ["rank", "image_id", "caption", "path", "score"];
    const rows = actualResults.map((r) =>
      [r.rank, r.image_id, `"${r.caption.replace(/"/g, '""')}"`, r.path, r.score].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "results_text.csv";
    a.click();
  }

  return (
    <div className="bg-gradient-to-b from-accent-pale to-bg min-h-screen">

      {/* Header */}
      <section className="max-w-[1400px] mx-auto px-6 py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-sm font-medium text-muted hover:text-accent hover:border-accent/30 transition-all shadow-sm hover:shadow mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {content.back}
        </button>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-text mb-3">
            {content.headline}
          </h1>
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {content.badge}
          </span>
        </div>
      </section>

      {/* Search Interface */}
      <div className="max-w-[900px] mx-auto px-6 pb-16">

        {/* Text Input */}
        <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm backdrop-blur-sm mb-6">
          <label className="block text-sm font-semibold text-text mb-1">
            {content.label}
            <span className="ml-2 text-xs font-normal text-muted">({content.langNote})</span>
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSearch();
            }}
            placeholder={content.placeholder}
            rows={4}
            maxLength={500}
            className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-bg text-text placeholder:text-muted text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-muted">{query.length}/500</span>
          </div>
        </div>

        {/* Controls (k slider + search button, no mode toggle) */}
        <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm backdrop-blur-sm mb-6">
          <Controls
            mode="semantic"
            onModeChange={() => {}}
            k={k}
            onKChange={setK}
            onSearch={handleSearch}
            disabled={!query.trim() || loading}
            showModeToggle={false}
          />
        </div>

        {/* Status */}
        <StatusBar status={status} tone="accent" />

        {/* Loader */}
        {loading && (
          <div className="flex justify-center py-6">
            <div className="animate-spin h-10 w-10 border-b-2 border-accent rounded-full"></div>
          </div>
        )}

        {/* Filtres */}
        {results && (
          <div className="flex gap-2 my-4 flex-wrap items-center bg-surface border border-border rounded-2xl p-4">

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Min Score</label>
              <div className="flex items-center gap-1">
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-24 h-1.5 rounded-full appearance-none bg-border
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-xs font-bold text-accent w-8">{Math.round(minScore * 100)}%</span>
              </div>
            </div>

            <div className="h-8 w-px bg-border mx-1" />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Caption</label>
              <div className="relative">
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text" placeholder="Filter by caption..."
                  value={captionFilter}
                  onChange={(e) => setCaptionFilter(e.target.value)}
                  className="pl-6 pr-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text placeholder:text-muted focus:outline-none focus:border-accent w-44"
                />
              </div>
            </div>

            <div className="h-8 w-px bg-border mx-1" />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Sort</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text cursor-pointer focus:outline-none focus:border-accent"
              >
                <option value="desc">Score ↓</option>
                <option value="asc">Score ↑</option>
              </select>
            </div>

            <div className="h-8 w-px bg-border mx-1" />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Export</label>
              <div className="flex gap-1.5">
                {[["JSON", exportJSON], ["CSV", exportCSV]].map(([label, fn]) => (
                  <button
                    key={label}
                    onClick={fn}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-border bg-bg text-muted hover:text-text hover:border-accent transition-all cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && <ResultsGrid data={filterResults(results)} />}

        {/* Empty state */}
        {!results && !loading && (
          <div className="bg-gradient-to-br from-accent-pale to-surface rounded-2xl p-12 border border-accent/20 shadow-sm text-center">
            <div className="flex justify-center mb-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-accent">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
                <line x1="11" y1="8" x2="11" y2="14" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-text mb-2">{content.headline}</h3>
            <p className="text-muted text-sm">{content.placeholder}</p>
          </div>
        )}
      </div>
    </div>
  );
}
