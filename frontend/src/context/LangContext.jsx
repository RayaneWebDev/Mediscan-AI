/**
 * @fileoverview Provider de langue avec transitions animées au changement.
 * @module context/LangContext
 */

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { en } from "../i18n/en";
import { fr } from "../i18n/fr";
import { LangContext } from "./LangContextValue";

const translations = { en, fr };

function normalizeLanguage(value) {
  return value === "fr" ? "fr" : "en";
}

function canUseAnimatedViewTransitions() {
  if (typeof document === "undefined" || typeof window === "undefined") return false;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const userAgent = window.navigator.userAgent;
  const isSafari = /Safari/i.test(userAgent) && !/Chrome|Chromium|Android/i.test(userAgent);
  return !prefersReduced && !isSafari && typeof document.startViewTransition === "function";
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => normalizeLanguage(localStorage.getItem("lang")));
  const [langVisible, setLangVisible] = useState(true);
  const timerRef = useRef(null);

  const t = translations[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = "ltr";

    localStorage.setItem("lang", lang);

    return () => {
      clearTimeout(timerRef.current);
    };
  }, [lang]);

  const setLanguage = (newLang) => {
    const nextLang = normalizeLanguage(newLang);
    if (nextLang === lang) return;

    if (!canUseAnimatedViewTransitions()) {
      clearTimeout(timerRef.current);
      setLangVisible(false);
      timerRef.current = setTimeout(() => {
        setLang(nextLang);
        setLangVisible(true);
      }, 160);
      return;
    }

    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setLang(nextLang);
      });
    });

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
