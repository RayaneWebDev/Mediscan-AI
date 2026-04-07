import { Search } from "lucide-react";
import { useState, useContext, useEffect } from "react";
import { LangContext } from "../context/lang-context";
import UploadZone from "./UploadZone";
import Controls from "./Controls";
import StatusBar from "./StatusBar";
import ResultsGrid from "./ResultsGrid";
import { searchImage, searchById, searchByIds } from "../api";
import ClinicalConclusion from "./ClinicalConclusion";

function VisualModeIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function InterpretiveModeIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export default function ImageSearchView({ onBack, onChromeToneChange, useSharedSurface = false }) {
  const { t } = useContext(LangContext);
  const content = t.search;
  const filters = t.search.filters;

  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("visual");
  const [k, setK] = useState(5);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [visualResults, setVisualResults] = useState(null);
  const [semanticResults, setSemanticResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // filtres
  const [minScore, setMinScore] = useState(0);
  const [searchText, setSearchText] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [compareMode, setCompareMode] = useState(false);
  const [toneTransitionReady, setToneTransitionReady] = useState(false);
  const [entryAnimationsActive, setEntryAnimationsActive] = useState(true);

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
  }

  function handleRemove() {
    setFile(null);
    setResults(null);
    setVisualResults(null);
    setSemanticResults(null);
    setStatus(null);
  }

  function filterResults(data) {
    if (!data || !data.results) return null;
    const filtered = data.results
      .filter((r) => r.score >= minScore)
      .filter((r) => r.caption.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => sortOrder === "desc" ? b.score - a.score : a.score - b.score);
    return { ...data, results: filtered };
  }

  function attachCallbacks(data) {
    return { ...data, onRelaunch: handleRelaunch, onRelaunchMultiple: handleRelaunchMultiple };
  }

  async function handleSearch() {
    if (!file) return;

    setLoading(true);
    setStatus({ type: "loading", message: content.searching });
    setResults(null);
    setVisualResults(null);
    setSemanticResults(null);

    try {
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

  async function handleRelaunch(imageId) {
    setLoading(true);
    setStatus({ type: "loading", message: content.searching });
    setResults(null);
    setVisualResults(null);
    setSemanticResults(null);

    try {
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
      setStatus(null);
    } catch (err) {
      setStatus({ type: "error", message: err.message || content.error });
    } finally {
      setLoading(false);
    }
  }

  async function handleRelaunchMultiple(imageIds) {
    setLoading(true);
    setStatus({ type: "loading", message: content.searching });
    setResults(null);
    setVisualResults(null);
    setSemanticResults(null);

    try {
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
      setStatus(null);
    } catch (err) {
      setStatus({ type: "error", message: err.message || content.error });
    } finally {
      setLoading(false);
    }
  }

  async function loadImageAsBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  function exportJSON() {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `results_${mode}.json`;
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
    a.download = `results_${mode}.csv`;
    a.click();
  }

  async function exportPDF() {
    if (!results) return;
    const { default: jsPDF } = await import("jspdf");
    const actualResults = Array.isArray(results) ? results : results.results;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Search Results", 10, 10);
    let y = 20;
    for (let i = 0; i < actualResults.length; i++) {
      const r = actualResults[i];
      let imgData = null;
      try {
        imgData = await loadImageAsBase64(r.path);
      } catch {
        console.warn("Image not loaded:", r.path);
      }
      doc.setFontSize(12);
      doc.text(`Result ${i + 1}`, 10, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(`ID: ${r.image_id}`, 10, y);
      y += 5;
      doc.text(`Score: ${r.score.toFixed(3)}`, 10, y);
      y += 5;
      doc.text(`Caption: ${r.caption}`, 10, y, { maxWidth: 180 });
      y += 8;
      if (imgData) {
        doc.addImage(imgData, "JPEG", 10, y, 60, 60);
        y += 65;
      }
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    }
    doc.save(`results_${mode}.pdf`);
  }

  const isAccent = compareMode || mode === "semantic";
  const useHomeVisualTone = !compareMode && mode === "visual";
  const isPreSearchState = !results && !visualResults && !loading;
  const panelHeightClass = isPreSearchState ? "lg:min-h-[13.25rem]" : "";
  const uploadPanelHeightClass = isPreSearchState ? "lg:min-h-[28rem]" : "";
  const preSearchPanelPaddingClass = isPreSearchState ? "p-5" : "p-6";
  const toneTransitionClass = toneTransitionReady ? "search-tone-transition" : "";
  const uploadEntryClass = entryAnimationsActive ? "by-image-panel-enter-left" : "";
  const controlsEntryClass = entryAnimationsActive ? "by-image-panel-enter-down" : "";
  const launchEntryClass = entryAnimationsActive ? "by-image-panel-enter-up" : "";
  const infoEntryClass = entryAnimationsActive ? "by-image-panel-enter-up" : "";

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

  return (
    <div className={`${isAccent ? "search-semantic-theme image-search-page-accent" : "image-search-page-primary"} ${useSharedSurface ? "" : "image-search-page"} bg-transparent`}>

      {/* Header with back button */}
      <section className="max-w-[1400px] mx-auto px-6 py-10">
        <button
          type="button"
          onClick={onBack}
          className={`${toneTransitionClass} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-sm font-medium text-muted shadow-sm hover:shadow mb-6 ${isAccent ? "hover:text-accent hover:border-accent/30" : "hover:text-primary hover:border-primary/30"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {content.image.back}
        </button>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-title mb-3">
            {content.image.headline}
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            {content.description}
          </p>
        </div>
      </section>

      {/* Search Interface */}
      <div className="max-w-[1400px] mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">

          {/* Upload - Left Sticky */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className={`${toneTransitionClass} image-search-panel ${isPreSearchState ? uploadEntryClass : ""} rounded-2xl border shadow-sm backdrop-blur-sm ${preSearchPanelPaddingClass} ${uploadPanelHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-primary/30"} ${isPreSearchState ? "flex flex-col" : ""}`}>
                <div className="mb-3">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${isAccent ? "mediscan-accent-chip" : useHomeVisualTone ? "mediscan-primary-chip border" : "border-primary/20 bg-primary-pale text-primary"}`}>
                    {content.step1}
                  </span>
                </div>
                <p className="text-sm text-muted mb-3">{content.step1Desc}</p>
                <UploadZone
                  file={file}
                  onFileSelect={handleFileSelect}
                  onRemove={handleRemove}
                  isAccent={isAccent}
                  useHomeVisualTone={useHomeVisualTone}
                  fillHeight={isPreSearchState}
                  enableToneTransition={toneTransitionReady}
                />
              </div>
            </div>
          </div>

          {/* Controls & Results - Right */}
          <div className="lg:col-span-2">

            {/* Controls */}
            <div className={`${toneTransitionClass} image-search-panel ${isPreSearchState ? controlsEntryClass : ""} rounded-2xl border shadow-sm backdrop-blur-sm mb-5 ${preSearchPanelPaddingClass} ${panelHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-primary/30"} ${isPreSearchState ? "flex flex-col" : ""}`}>
              <div className="mb-3">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${isAccent ? "mediscan-accent-chip" : useHomeVisualTone ? "mediscan-primary-chip border" : "border-primary/20 bg-primary-pale text-primary"}`}>
                  {content.step2}
                </span>
              </div>
              <div className={isPreSearchState ? "mt-auto" : ""}>
                <Controls
                  mode={mode}
                  onModeChange={setMode}
                  k={k}
                  onKChange={setK}
                  onSearch={handleSearch}
                  disabled={!file || loading}
                  useHomeVisualTone={useHomeVisualTone}
                  enableToneTransition={toneTransitionReady}
                />
              </div>
            </div>

            {/* Status */}
            <StatusBar
              status={status}
              tone={isAccent ? "accent" : "primary"}
              useHomeVisualTone={useHomeVisualTone}
              enableToneTransition={toneTransitionReady}
            />

            {/* Loader */}
            {loading && (
              <div className="flex justify-center py-6">
                <div className={`animate-spin h-10 w-10 border-2 rounded-full ${isAccent ? "border-accent/20 border-t-accent/70" : "border-primary/20 border-t-primary/70"}`}></div>
              </div>
            )}

            {/* Filtres */}
            {(results || visualResults) && (
              <div className={`${toneTransitionClass} flex gap-2 my-4 flex-wrap items-center border rounded-2xl p-4 ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-surface border-border"}`}>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">{filters.minScore}</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="range" min="0" max="1" step="0.01"
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      className={`w-24 h-1.5 rounded-full appearance-none bg-border
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:cursor-pointer
                        ${isAccent ? "[&::-webkit-slider-thumb]:bg-accent/70" : "[&::-webkit-slider-thumb]:bg-primary/70"}`}
                    />
                    <span className={`text-xs font-bold w-8 ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-primary"}`}>{Math.round(minScore * 100)}%</span>
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
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className={`pl-6 pr-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text placeholder:text-muted focus:outline-none w-44 ${isAccent ? "focus:border-accent" : "focus:border-primary"}`}
                    />
                  </div>
                </div>

                <div className="h-8 w-px bg-border mx-1" />

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">{filters.sort}</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className={`px-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text cursor-pointer focus:outline-none ${isAccent ? "focus:border-accent" : "focus:border-primary"}`}
                  >
                    <option value="desc">{filters.sortDesc}</option>
                    <option value="asc">{filters.sortAsc}</option>
                  </select>
                </div>

                <div className="h-8 w-px bg-border mx-1" />

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">{filters.compare}</label>
                  <button
                    type="button"
                    onClick={() => setCompareMode(!compareMode)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer
                      ${compareMode
                        ? "bg-accent text-on-strong border-accent"
                        : isAccent
                          ? "mediscan-accent-outline-button"
                          : useHomeVisualTone
                            ? "mediscan-primary-outline-button"
                            : "bg-bg text-muted border-border hover:border-accent hover:text-accent"
                      }`}
                  >
                    {compareMode ? filters.compareOn : filters.compare}
                  </button>
                </div>

                <div className="h-8 w-px bg-border mx-1" />

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">{filters.export}</label>
                  <div className="flex gap-1.5">
                    {[["JSON", exportJSON], ["CSV", exportCSV], ["PDF", exportPDF]].map(([label, fn]) => (
                      <button
                        type="button"
                        key={label}
                        onClick={fn}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${isAccent ? "mediscan-accent-outline-button" : useHomeVisualTone ? "mediscan-primary-outline-button" : "border-border bg-bg text-muted hover:text-text hover:border-primary"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {!compareMode && results && (
              <>
                <ResultsGrid data={filterResults(results)} useHomeVisualTone={useHomeVisualTone} />
                <ClinicalConclusion searchResult={results} isAccent={isAccent} />
              </>
            )}

            {compareMode && visualResults && semanticResults && (
              <>
                <div className="grid md:grid-cols-2 gap-6 mt-4">
                  <div>
                    <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">{t.search.results.visualMode}</h3>
                    <ResultsGrid data={filterResults(visualResults)} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-accent mb-3 uppercase tracking-wider">{t.search.results.semanticMode}</h3>
                    <ResultsGrid data={filterResults(semanticResults)} />
                  </div>
                </div>
                <ClinicalConclusion searchResult={visualResults} isAccent={false} />
              </>
            )}

            {/* Empty State - file selected, no results */}
            {!results && !visualResults && !loading && file && (
              <div className={`${toneTransitionClass} image-search-panel ${launchEntryClass} rounded-2xl p-6 md:p-7 border shadow-sm backdrop-blur-sm ${panelHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-primary-pale/30 border-primary/20"} flex flex-col justify-between text-left`}>
                <div>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${isAccent ? "mediscan-accent-chip" : useHomeVisualTone ? "mediscan-primary-chip border" : "border-primary/20 bg-primary-pale text-primary"}`}>
                    {content.image.pendingStep}
                  </span>
                  <h3 className={`mt-4 text-xl md:text-[1.35rem] font-bold ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-primary"}`}>
                    {content.image.pendingTitle}
                  </h3>
                  <p className={`mt-2.5 max-w-2xl text-sm leading-6 ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-muted"}`}>
                    {content.image.pendingDescription}
                  </p>
                </div>
              </div>
            )}

            {/* Empty State - no file */}
            {!file && !results && !visualResults && (
              <div className={`${toneTransitionClass} image-search-panel ${launchEntryClass} rounded-2xl p-6 md:p-7 border shadow-sm ${panelHeightClass} ${isAccent ? "mediscan-accent-surface" : useHomeVisualTone ? "mediscan-primary-surface" : "bg-gradient-to-br from-primary-pale to-surface border-primary/20"} flex flex-col justify-between text-left`}>
                <div>
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${isAccent ? "mediscan-accent-chip" : useHomeVisualTone ? "mediscan-primary-chip border" : "border-primary/20 bg-primary-pale text-primary"}`}>
                    {content.image.readyStep}
                  </span>
                  <div className="mt-4 flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isAccent ? "mediscan-accent-chip" : useHomeVisualTone ? "mediscan-primary-chip" : "border-primary/20 bg-primary-pale text-primary"}`}>
                      <Search className="w-4.5 h-4.5 transition-colors duration-300" strokeWidth={1.8} />
                    </div>
                    <div>
                      <h3 className={`text-xl md:text-[1.35rem] font-bold ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-primary"}`}>
                        {content.image.readyTitle}
                      </h3>
                      <p className={`mt-2.5 max-w-2xl text-sm leading-6 ${isAccent ? "mediscan-accent-text" : useHomeVisualTone ? "mediscan-primary-text" : "text-muted"}`}>
                        {content.image.readyDescription}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="max-w-[1400px] mx-auto px-6 pb-14">
        <div className={`${infoEntryClass} border-t border-border/70 pt-7`}>
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {content.image.legendEyebrow}
            </p>
            <h2 className="mt-4 text-xl font-bold text-title md:text-2xl">
              {content.image.legendTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
              {content.image.legendDescription}
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <article className="flex items-start gap-4">
              <div className="mediscan-primary-chip flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                <VisualModeIcon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mediscan-primary-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    {content.image.legend.visual.label}
                  </span>
                  <h3 className="text-base font-bold text-title">
                    {content.image.legend.visual.title}
                  </h3>
                </div>
                <p className="mediscan-primary-text mt-3 text-sm leading-7">
                  {content.image.legend.visual.description}
                </p>
                <p className="mt-2 text-xs leading-6 text-muted">
                  {content.image.legend.visual.note}
                </p>
              </div>
            </article>

            <article className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/18 bg-accent-pale text-accent">
                <InterpretiveModeIcon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mediscan-accent-chip inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                    {content.image.legend.interpretive.label}
                  </span>
                  <h3 className="text-base font-bold text-title">
                    {content.image.legend.interpretive.title}
                  </h3>
                </div>
                <p className="mediscan-accent-text mt-3 text-sm leading-7">
                  {content.image.legend.interpretive.description}
                </p>
                <p className="mt-2 text-xs leading-6 text-muted">
                  {content.image.legend.interpretive.note}
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="border-t py-8">
        <div className="max-w-[1400px] mx-auto px-6 text-center">
          <p className="text-sm text-muted">{content.footer}</p>
        </div>
      </section>
    </div>
  );
}
