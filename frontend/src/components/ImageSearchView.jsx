import { Hospital, Search } from "lucide-react";
import { useState, useContext, useEffect } from "react";
import { LangContext } from "../context/lang-context";
import UploadZone from "./UploadZone";
import Controls from "./Controls";
import StatusBar from "./StatusBar";
import ResultsGrid from "./ResultsGrid";
import { searchImage, searchById, searchByIds } from "../api";
import jsPDF from "jspdf";

const searchModeIcons = {
  search: Search,
  hospital: Hospital,
};

export default function ImageSearchView({ onBack, onChromeToneChange }) {
  const { t } = useContext(LangContext);
  const content = t.search;

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

  function handleFileSelect(f) {
    if (!f.type.match(/^image\/(jpeg|png)$/)) {
      setStatus({
        type: "error",
        message: "Only JPEG and PNG files are accepted.",
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
      const data = await searchById(imageId, mode, k);
      setResults(attachCallbacks(data));
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
      const data = await searchByIds(imageIds, mode, k);
      setResults(attachCallbacks(data));
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
      } catch (e) {
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
  const themeClass = isAccent ? "from-accent-pale to-surface" : "from-primary-pale to-surface";

  useEffect(() => {
    onChromeToneChange?.(isAccent ? "accent" : "primary");
  }, [isAccent, onChromeToneChange]);

  return (
    <div className={`bg-gradient-to-b ${themeClass} transition-colors duration-300`}>

      {/* Header with back button */}
      <section className="max-w-[1400px] mx-auto px-6 py-10">
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-sm font-medium text-muted transition-all shadow-sm hover:shadow mb-6 ${isAccent ? "hover:text-accent hover:border-accent/30" : "hover:text-primary hover:border-primary/30"}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {content.image.back}
        </button>
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-text mb-3">
            {content.image.headline}
          </h1>
          <p className="text-lg text-muted max-w-2xl mx-auto">
            {content.description}
          </p>
        </div>
      </section>

      {/* Search Interface */}
      <div className="max-w-[1400px] mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Upload - Left Sticky */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm backdrop-blur-sm">
                <h2 className="font-bold text-text mb-1">{content.step1}</h2>
                <p className="text-sm text-muted mb-4">{content.step1Desc}</p>
                <UploadZone
                  file={file}
                  onFileSelect={handleFileSelect}
                  onRemove={handleRemove}
                />
              </div>
            </div>
          </div>

          {/* Controls & Results - Right */}
          <div className="lg:col-span-2">

            {/* Controls */}
            <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm backdrop-blur-sm mb-6">
              <h2 className="font-bold text-text mb-4">{content.step2}</h2>
              <Controls
                mode={mode}
                onModeChange={setMode}
                k={k}
                onKChange={setK}
                onSearch={handleSearch}
                disabled={!file || loading}
              />
            </div>

            {/* Status */}
            <StatusBar status={status} tone={compareMode || mode === "semantic" ? "accent" : "primary"} />

            {/* Loader */}
            {loading && (
              <div className="flex justify-center py-6">
                <div className={`animate-spin h-10 w-10 border-b-2 rounded-full ${compareMode || mode === "semantic" ? "border-accent" : "border-primary"}`}></div>
              </div>
            )}

            {/* Filtres */}
            {(results || visualResults) && (
              <div className="flex gap-2 my-4 flex-wrap items-center bg-surface border border-border rounded-2xl p-4">

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Min Score</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="range" min="0" max="1" step="0.01"
                      value={minScore}
                      onChange={(e) => setMinScore(Number(e.target.value))}
                      className={`w-24 h-1.5 rounded-full appearance-none bg-border
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:cursor-pointer
                        ${isAccent ? "[&::-webkit-slider-thumb]:bg-accent" : "[&::-webkit-slider-thumb]:bg-primary"}`}
                    />
                    <span className={`text-xs font-bold w-8 ${isAccent ? "text-accent" : "text-primary"}`}>{Math.round(minScore * 100)}%</span>
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
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className={`pl-6 pr-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text placeholder:text-muted focus:outline-none w-44 ${isAccent ? "focus:border-accent" : "focus:border-primary"}`}
                    />
                  </div>
                </div>

                <div className="h-8 w-px bg-border mx-1" />

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Sort</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className={`px-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text cursor-pointer focus:outline-none ${isAccent ? "focus:border-accent" : "focus:border-primary"}`}
                  >
                    <option value="desc">Score ↓</option>
                    <option value="asc">Score ↑</option>
                  </select>
                </div>

                <div className="h-8 w-px bg-border mx-1" />

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Compare</label>
                  <button
                    onClick={() => setCompareMode(!compareMode)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer
                      ${compareMode
                        ? "bg-accent text-white border-accent"
                        : "bg-bg text-muted border-border hover:border-accent hover:text-accent"
                      }`}
                  >
                    {compareMode ? "✓ Compare ON" : "Compare"}
                  </button>
                </div>

                <div className="h-8 w-px bg-border mx-1" />

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Export</label>
                  <div className="flex gap-1.5">
                    {[["JSON", exportJSON], ["CSV", exportCSV], ["PDF", exportPDF]].map(([label, fn]) => (
                      <button
                        key={label}
                        onClick={fn}
                        className={`px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-border bg-bg text-muted hover:text-text transition-all cursor-pointer ${isAccent ? "hover:border-accent" : "hover:border-primary"}`}
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
              <ResultsGrid data={filterResults(results)} />
            )}

            {compareMode && visualResults && semanticResults && (
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div>
                  <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Visual (DINOv2)</h3>
                  <ResultsGrid data={filterResults(visualResults)} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-accent mb-3 uppercase tracking-wider">Semantic (BioMedCLIP)</h3>
                  <ResultsGrid data={filterResults(semanticResults)} />
                </div>
              </div>
            )}

            {/* Empty State - file selected, no results */}
            {!results && !loading && file && (
              <div className="bg-surface rounded-2xl p-12 border border-border shadow-sm backdrop-blur-sm text-center">
                <p className="text-muted">
                  Configure your search and click "{content.search}" to find matching images.
                </p>
              </div>
            )}

            {/* Empty State - no file */}
            {!file && !results && (
              <div className="bg-gradient-to-br from-primary-pale to-accent-pale rounded-2xl p-12 border border-primary/20 shadow-sm text-center">
                <div className="flex justify-center mb-4">
                  <Search className="w-10 h-10 text-primary" strokeWidth={1.8} />
                </div>
                <h3 className="text-xl font-bold text-text mb-2">Ready to search?</h3>
                <p className="text-muted">Upload a medical image on the left to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <section className="bg-surface border-t border-border py-16 transition-colors duration-300">
        <div className="max-w-[1400px] mx-auto px-6">
          <h2 className="text-3xl font-bold text-text text-center mb-12">{content.howWorks}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { name: content.visual.name, icon: content.visual.icon, desc: content.visual.desc, use: content.visual.use, color: "primary" },
              { name: content.semantic.name, icon: content.semantic.icon, desc: content.semantic.desc, use: content.semantic.use, color: "accent" },
            ].map((m) => {
              const ModeIcon = searchModeIcons[m.icon];
              const isBg = m.color === "primary" ? "from-primary-pale to-surface" : "from-accent-pale to-surface";
              const border = m.color === "primary" ? "border-primary/20" : "border-accent/20";
              return (
                <div key={m.name} className={`bg-gradient-to-br ${isBg} border ${border} rounded-2xl p-8`}>
                  <div className="mb-3">
                    {ModeIcon ? <ModeIcon className="w-10 h-10 text-text" strokeWidth={1.8} /> : null}
                  </div>
                  <h3 className="text-2xl font-bold text-text mb-2">{m.name}</h3>
                  <p className="text-muted mb-4">{m.desc}</p>
                  <p className="text-sm font-semibold text-text">{m.use}</p>
                </div>
              );
            })}
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