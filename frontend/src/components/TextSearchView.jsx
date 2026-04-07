import { useState, useContext, useEffect } from "react";
import { LangContext } from "../context/lang-context";
import Controls from "./Controls";
import StatusBar from "./StatusBar";
import ResultsGrid from "./ResultsGrid";
import { searchText } from "../api";
import ClinicalConclusion from "./ClinicalConclusion";

export default function TextSearchView({ onBack, onChromeToneChange }) {
  const { t } = useContext(LangContext);
  const content = t.search.text;
  const filters = t.search.filters;

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
    <div className="search-semantic-theme bg-transparent">

      {/* Header */}
      <section className="max-w-[1400px] mx-auto px-6 py-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-sm font-medium text-muted hover:text-accent hover:border-accent/30 transition-all shadow-sm hover:shadow mb-6"
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
          <span className="mediscan-accent-chip inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium">
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
        <div className="image-search-panel mediscan-accent-surface rounded-2xl p-6 border shadow-sm backdrop-blur-sm mb-6">
          <div className="mb-3">
            <span className="mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
              1. Medical Query
            </span>
          </div>
          <label className="block text-sm font-semibold text-title mb-1">
            <span className="text-xs font-normal text-muted">({content.langNote})</span>
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
            className="w-full mt-2 px-4 py-3 rounded-xl border border-border bg-transparent text-text placeholder:text-muted text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all"
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs text-muted">{query.length}/500</span>
          </div>
        </div>

        {/* Controls (k slider + search button, no mode toggle) */}
        <div className="image-search-panel mediscan-accent-surface rounded-2xl p-6 border shadow-sm backdrop-blur-sm mb-6">
          <div className="mb-3">
            <span className="mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
              2. Choose Number of Results
            </span>
          </div>
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
            <div className="animate-spin h-10 w-10 border-2 border-accent/20 border-t-accent/70 rounded-full"></div>
          </div>
        )}

        {/* Filtres */}
        {results && (
          <div className="image-search-panel mediscan-accent-surface flex gap-2 my-4 flex-wrap items-center border rounded-2xl p-4">

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">{filters.minScore}</label>
              <div className="flex items-center gap-1">
                <input
                  type="range" min="0" max="1" step="0.01"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-24 h-1.5 rounded-full appearance-none bg-border
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-accent/70 [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="text-xs font-bold mediscan-accent-text w-8">{Math.round(minScore * 100)}%</span>
              </div>
            </div>

            <div className="h-8 w-px bg-border mx-1" />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">{filters.caption}</label>
              <div className="relative">
                <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text" placeholder={filters.captionPlaceholder}
                  value={captionFilter}
                  onChange={(e) => setCaptionFilter(e.target.value)}
                  className="pl-6 pr-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text placeholder:text-muted focus:outline-none focus:border-accent w-44"
                />
              </div>
            </div>

            <div className="h-8 w-px bg-border mx-1" />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">{filters.sort}</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text cursor-pointer focus:outline-none focus:border-accent"
              >
                <option value="desc">{filters.sortDesc}</option>
                <option value="asc">{filters.sortAsc}</option>
              </select>
            </div>

            <div className="h-8 w-px bg-border mx-1" />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">{filters.export}</label>
              <div className="flex gap-1.5">
                {[["JSON", exportJSON], ["CSV", exportCSV]].map(([label, fn]) => (
                  <button
                    type="button"
                    key={label}
                    onClick={fn}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer mediscan-accent-outline-button"
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
        {results && <ClinicalConclusion searchResult={results} isAccent={true} />}

        {/* Empty state */}
        {!results && !loading && (
          <div className="image-search-panel mediscan-accent-surface rounded-2xl p-6 md:p-7 border shadow-sm flex flex-col justify-between text-left">
            <div>
              <span className="mediscan-accent-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                3. Launch Search
              </span>
              <div className="mt-4 flex items-start gap-3">
                <div className="mediscan-accent-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl md:text-[1.35rem] font-bold mediscan-accent-text">
                    {content.headline}
                  </h3>
                  <p className="mt-2.5 max-w-2xl text-sm leading-6 mediscan-accent-text">
                    {content.placeholder}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend / QuickNote Section - Block 3 copied from Visual Search */}
      <section className="max-w-[1400px] mx-auto px-6 pb-14">
        <div className="border-t border-border/70 pt-7">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Quick note
            </p>
            <h2 className="mt-4 text-xl font-bold text-title md:text-2xl">
              Medical Text Search
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              Search using natural language text to find medical images semantically.
            </p>
          </div>

          <div className="mt-6">
            <article className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/18 bg-accent-pale text-accent">
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    Interpretive Analysis
                  </span>
                  <h3 className="text-base font-bold text-title">
                    Semantic Search
                  </h3>
                </div>
                <p className="mediscan-accent-text mt-3 text-sm leading-7">
                  Describe the medical findings you're looking for using natural language. Our semantic model understands clinical terminology and finds images with similar characteristics.
                </p>
                <p className="mt-2 text-xs leading-6 text-muted">
                  E.g: chest X-ray bilateral pneumonia
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
