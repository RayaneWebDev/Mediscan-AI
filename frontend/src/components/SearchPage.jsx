import { Hospital, Search } from "lucide-react";
import { useState, useContext } from "react";
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

export default function SearchPage() {
  const { t } = useContext(LangContext);
  const content = t.search;

  const [file, setFile] = useState(null);
  const [mode, setMode] = useState("visual");
  const [k, setK] = useState(5);

  const [results, setResults] = useState(null);
  const [visualResults, setVisualResults] = useState(null);
  const [semanticResults, setSemanticResults] = useState(null);

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔎 filtres
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

  async function handleSearch() {
    if (!file) return;

    setLoading(true);
    setStatus({ type: "loading", message: content.searching });

    try {
      if (compareMode) {
          const [visual, semantic] = await Promise.all([
            searchImage(file, "visual", k),
            searchImage(file, "semantic", k),
          ]);
        
          setVisualResults(visual);   // objet complet { mode, results: [...] }
          setSemanticResults(semantic);
          setResults(null);
        }
      else {
        const data = await searchImage(file, mode, k);
        setResults(data);
        setVisualResults(null);
        setSemanticResults(null);
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

  // 🔥 filtrage
  function filterResults(data) {
  if (!data || !data.results) return null;

  const filtered = data.results
    .filter((r) => r.score >= minScore)
    .filter((r) =>
      r.caption.toLowerCase().includes(searchText.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === "desc" ? b.score - a.score : a.score - b.score
    );

  return { ...data, results: filtered }; // ← garde mode + results filtré
} 

  // 🔥 image → base64
  async function loadImageAsBase64(url) {
    const res = await fetch(url);
    const blob = await res.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }

  // EXPORT JSON
  function exportJSON() {
    const data = results || visualResults;
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `results.json`;
    a.click();
  }

  // EXPORT CSV
  function exportCSV() {
    const data = results || visualResults;
    if (!data) return;

    const arr = Array.isArray(data) ? data : data.results;

    const headers = ["image_id", "caption", "path", "score"];
    const rows = arr.map((r) =>
      [r.image_id, `"${r.caption}"`, r.path, r.score].join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `results.csv`;
    a.click();
  }

  // EXPORT PDF
  async function exportPDF() {
    const data = results || visualResults;
    if (!data) return;

    const arr = Array.isArray(data) ? data : data.results;
    const doc = new jsPDF();

    let y = 20;

    for (let i = 0; i < arr.length; i++) {
      const r = arr[i];

      doc.text(`Result ${i + 1}`, 10, y);
      y += 6;

      doc.text(`ID: ${r.image_id}`, 10, y);
      y += 5;

      doc.text(`Score: ${r.score.toFixed(3)}`, 10, y);
      y += 5;

      doc.text(`Caption: ${r.caption}`, 10, y, { maxWidth: 180 });
      y += 8;

      try {
        const img = await loadImageAsBase64(r.path);
        doc.addImage(img, "JPEG", 10, y, 60, 60);
        y += 65;
      } catch {}

      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    }

    doc.save("results.pdf");
  }

  const themeClass =
    mode === "visual"
      ? "from-primary-pale to-surface"
      : "from-accent-pale to-surface";

  return (
    <div className={`bg-gradient-to-b ${themeClass}`}>

      {/* HEADER */}
      <section className="text-center py-10">
        <h1 className="text-4xl font-bold">{content.headline}</h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 items-start">

        {/* UPLOAD */}
        <UploadZone
          file={file}
          onFileSelect={handleFileSelect}
          onRemove={handleRemove}
        />

        {/* MAIN */}
        <div className="lg:col-span-2">

          <Controls
            mode={mode}
            onModeChange={setMode}
            k={k}
            onKChange={setK}
            onSearch={handleSearch}
          />

          <StatusBar status={status} />

          {/* FILTRES */}

          {(results || visualResults) && (
            <div className="flex gap-2 my-4 flex-wrap items-center bg-surface border border-border rounded-2xl p-4">

              {/* Min score */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Min Score</label>
                <div className="flex items-center gap-1">
                  <input
                    type="range"
                    min="0" max="1" step="0.01"
                    value={minScore}
                    onChange={(e) => setMinScore(Number(e.target.value))}
                    className="w-24 h-1.5 rounded-full appearance-none bg-border
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <span className="text-xs font-bold text-primary w-8">{Math.round(minScore * 100)}%</span>
                </div>
              </div>
          
              {/* Séparateur */}
              <div className="h-8 w-px bg-border mx-1" />
          
              {/* Search caption */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Caption</label>
                <div className="relative">
                  <svg className="absolute left-2 top-1/2 -translate-y-1/2 text-muted" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input
                    type="text"
                    placeholder="Filter by caption..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-6 pr-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text placeholder:text-muted focus:outline-none focus:border-primary w-44"
                  />
                </div>
              </div>
          
              {/* Séparateur */}
              <div className="h-8 w-px bg-border mx-1" />
          
              {/* Sort */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Sort</label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-border rounded-xl bg-bg text-text cursor-pointer focus:outline-none focus:border-primary"
                >
                  <option value="desc">Score ↓</option>
                  <option value="asc">Score ↑</option>
                </select>
              </div>
          
              {/* Séparateur */}
              <div className="h-8 w-px bg-border mx-1" />
          
              {/* Compare toggle */}
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
                  
              {/* Séparateur */}
              <div className="h-8 w-px bg-border mx-1" />
                  
              {/* Export */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-muted font-semibold uppercase tracking-wider">Export</label>
                <div className="flex gap-1.5">
                  {[["JSON", exportJSON], ["CSV", exportCSV], ["PDF", exportPDF]].map(([label, fn]) => (
                    <button
                      key={label}
                      onClick={fn}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-border bg-bg text-muted hover:text-text hover:border-primary transition-all cursor-pointer"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RESULTATS */}
          {!compareMode && results && (
            <ResultsGrid data={filterResults(results)} />
          )}

          {compareMode && visualResults && semanticResults && (
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <h3 className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">
                  Visual (DINOv2)
                </h3>
                <ResultsGrid data={filterResults(visualResults)} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-accent mb-3 uppercase tracking-wider">
                  Semantic (BioMedCLIP)
                </h3>
                <ResultsGrid data={filterResults(semanticResults)} />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}