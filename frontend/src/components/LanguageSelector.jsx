/**
 * @fileoverview Sélecteur de langue et de thème (clair/sombre).
 * @module components/LanguageSelector
 */

import { useState, useRef, useEffect, useContext } from "react";
import { Moon, Sun, Globe, ChevronDown, Check } from "lucide-react";
import { LangContext } from "../context/LangContextValue";
import { useTheme } from "../context/useTheme";

/**
 * Composant permettant à l'utilisateur de :
 * - Basculer entre le thème.
 * - Choisir la langue de l'interface entre le français et l'anglais.
 * 
 * Langues supportées :
 * - anglais
 * - français
 *
 * @component
 * @returns {JSX.Element}
 *
 */
export default function LanguageSelector() {
  const { lang, setLanguage } = useContext(LangContext);
  const { theme, setTheme } = useTheme();
  /** @type {[boolean, function]} État d'ouverture du dropdown (Menu déroulant)*/
  const [open, setOpen] = useState(false);
  /** Référence sur le conteneur pour détecter les clics extérieurs */
  const ref = useRef(null);

  // Fermeture du dropdown (Menu déroulant) au clic en dehors
  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** Icône affichée selon le thème actif */
  const ThemeIcon = theme === "dark" ? Moon : Sun;

  /** @type {Array<{id: string, label: string}>} */
  const languages = [
    { id: "en", label: "English" },
    { id: "fr", label: "Français" },
  ];
  
  return (
    <div ref={ref} className="relative z-50">
      {/* Bouton déclencheur */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="settings-trigger flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ThemeIcon key={theme} className="settings-trigger-icon theme-icon-enter w-4 h-4" strokeWidth={1.8} />
        <span key={lang} className="uppercase lang-label-enter">{lang}</span>
        <ChevronDown
          className={`settings-trigger-chevron w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {/* Dropdown (Menu déroulant)*/}
      {open && (
        <div 
          className="settings-menu settings-menu-enter absolute bottom-full right-0 mb-2 w-44 rounded-2xl overflow-hidden transition-all duration-200 md:bottom-auto md:top-full md:mt-2 md:mb-0">
          {/* Section Thème */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1.5">
              {lang === "fr" ? "Thème" : "Theme"}
            </p>
            <div className="flex gap-1">
              {[
                { id: "light", label: lang === "fr" ? "Clair" : "Light", Icon: Sun },
                { id: "dark",  label: lang === "fr" ? "Sombre" : "Dark",  Icon: Moon },
              ].map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    setTheme(option.id, r.left + r.width / 2, r.top + r.height / 2);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer
                    ${theme === option.id
                      ? "settings-option-active"
                      : "settings-option-inactive"
                    }`}
                >
                  <option.Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                  {option.label}
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
            
            <div className="flex flex-col gap-0.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
              {languages.map(({ id, label }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => { setLanguage(id); setOpen(false); }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0
                    ${lang === id ? "settings-option-active" : "settings-option-inactive"}`}
                >
                  <div className="flex items-center">
                    <span>{label}</span>
                  </div>
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
