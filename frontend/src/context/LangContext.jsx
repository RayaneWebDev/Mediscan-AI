import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { LangContext } from "./lang-context";

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "en");
  const [langVisible, setLangVisible] = useState(true);
  const timerRef = useRef(null);

  const t = lang === "fr" ? fr : en;

  const setLanguage = (newLang) => {
    if (newLang === lang) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!document.startViewTransition || prefersReduced) {
      clearTimeout(timerRef.current);
      setLangVisible(false);
      timerRef.current = setTimeout(() => {
        setLang(newLang);
        localStorage.setItem("lang", newLang);
        setLangVisible(true);
      }, 160);
      return;
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setLang(newLang);
        localStorage.setItem("lang", newLang);
      });
    });

    // Fondu doux avec légère montée du contenu
    transition.ready.then(() => {
      document.documentElement.animate(
        { opacity: [1, 0], transform: ["translateY(0)", "translateY(-6px)"] },
        { duration: 260, easing: "ease-in", pseudoElement: "::view-transition-old(root)" }
      );
      document.documentElement.animate(
        { opacity: [0, 1], transform: ["translateY(8px)", "translateY(0)"] },
        { duration: 380, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
  };

  return (
    <LangContext.Provider value={{ lang, t, setLanguage, langVisible }}>
      {children}
    </LangContext.Provider>
  );
}
