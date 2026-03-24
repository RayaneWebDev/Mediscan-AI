import { useState, useRef, useEffect, useContext } from "react";
import { Moon, Sun, Globe, ChevronDown, Check } from "lucide-react";
import { LangContext } from "../context/lang-context";
import { useTheme } from "../context/useTheme";

export default function SettingsMenu() {
  const { lang, setLanguage } = useContext(LangContext);
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Ferme le menu si clic en dehors
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const ThemeIcon = theme === "dark" ? Moon : Sun;

  return (
    <div ref={ref} className="fixed top-4 right-4 z-50">
      {/* Bouton déclencheur */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-surface/88 backdrop-blur-xl shadow-lg text-text hover:bg-bg-soft transition-all text-xs font-semibold"
      >
        <ThemeIcon className="w-4 h-4 text-primary" strokeWidth={1.8} />
        <span className="uppercase">{lang}</span>
        <ChevronDown
          className={`w-3 h-3 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-border bg-surface backdrop-blur-xl shadow-xl overflow-hidden">
          {/* Section Thème */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">
              {lang === "fr" ? "Thème" : "Theme"}
            </p>
            <div className="flex gap-1">
              {[
                { id: "light", label: lang === "fr" ? "Clair" : "Light", Icon: Sun },
                { id: "dark",  label: lang === "fr" ? "Sombre" : "Dark",  Icon: Moon },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
                    ${theme === id
                      ? "bg-gradient-to-r from-primary to-accent text-white shadow-sm"
                      : "text-muted hover:text-text hover:bg-bg-soft"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Séparateur */}
          <div className="mx-3 my-2 border-t border-border" />

          {/* Section Langue */}
          <div className="px-3 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5 flex items-center gap-1">
              <Globe className="w-3 h-3" strokeWidth={2} />
              {lang === "fr" ? "Langue" : "Language"}
            </p>
            <div className="flex flex-col gap-0.5">
              {[
                { id: "en", label: "English" },
                { id: "fr", label: "Français" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => { setLanguage(id); setOpen(false); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
                    ${lang === id
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-text hover:bg-bg-soft"
                    }`}
                >
                  {label}
                  {lang === id && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
