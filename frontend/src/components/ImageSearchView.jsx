import { Hospital, Search } from "lucide-react";
import { useState, useContext, useEffect } from "react";
import { LangContext } from "../context/lang-context";
import UploadZone from "./UploadZone";
import Controls from "./Controls";
import StatusBar from "./StatusBar";
import ResultsGrid from "./ResultsGrid";
import { searchImage } from "../api";
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
  const [loading, setLoading] = useState(false);

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
    setStatus(null);
  }

  async function handleSearch() {
    if (!file) return;

    setLoading(true);
    setStatus({ type: "loading", message: content.searching });
    setResults(null);

    try {
      const data = await searchImage(file, mode, k);
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

  const themeClass =
    mode === "visual" ? "from-primary-pale to-surface" : "from-accent-pale to-surface";

  useEffect(() => {
    onChromeToneChange?.(mode === "visual" ? "primary" : "accent");
  }, [mode, onChromeToneChange]);

  return (
    <div className={`bg-gradient-to-b ${themeClass} transition-colors duration-300`}>

      {/* Header with back button */}
      <section className="max-w-[1400px] mx-auto px-6 py-10">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border/60 text-sm font-medium text-muted hover:text-primary hover:border-primary/30 transition-all shadow-sm hover:shadow mb-6"
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
            <StatusBar status={status} />

            {/* Loader */}
            {loading && (
              <div className="flex justify-center py-6">
                <div className="animate-spin h-10 w-10 border-b-2 border-primary rounded-full"></div>
              </div>
            )}

            {/* Results */}
            {results && (
              <div className="bg-surface rounded-2xl p-6 border border-border shadow-sm backdrop-blur-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-text">{content.step3}</h2>
                  <div className="flex gap-2">
                    <button onClick={exportJSON} className="px-3 py-1 border rounded-lg hover:bg-primary/10">
                      JSON
                    </button>
                    <button onClick={exportCSV} className="px-3 py-1 border rounded-lg hover:bg-primary/10">
                      CSV
                    </button>
                    <button onClick={exportPDF} className="px-3 py-1 border rounded-lg hover:bg-primary/10">
                      PDF
                    </button>
                  </div>
                </div>
                <ResultsGrid data={results} />
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
