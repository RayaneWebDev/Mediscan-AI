/** 
 * @fileoverview Écran de recherche permettant de choisir le mode de recherche CBIR.
 * @module components/SearchHubView
 */

import { Eye } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { LangContext } from "../context/LangContextValue";
import { InterpretiveModeIcon } from "./icons";

const HUB_INTRO_ANIMATION = {
  enabled: true,
};

const HUB_INTRO_TOTAL_MS = 2400;

/**
 * État initial de l'animation d'intro du hub.
 * Tient compte de prefers-reduced-motion et de la disponibilité d'IntersectionObserver.
 * @returns {"idle"|"playing"|"done"|"disabled"}
 */
function getInitialHubIntroState() {
  if (!HUB_INTRO_ANIMATION.enabled) {
    return "disabled";
  }

  if (typeof window === "undefined") {
    return "idle";
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
    return "done";
  }

  if (typeof IntersectionObserver === "undefined") {
    return "playing";
  }

  return "idle";
}

/**
 * Choix de mode de recherche via donut interactif.
 *
 * @component
 * @param {object} props - Propriétés du composant.
 * @param {function(): void} props.onClick - Callback déclenché au clic sur le donut.
 * @param {string} props.title - Titre principal de la carte.
 * @param {string} props.description - Description du mode de recherche.
 * @param {string} props.cta - Texte du bouton d'appel à l'action.
 * @param {"primary"|"accent"} props.tone - Palette de couleur de la carte.
 * @param {JSX.Element} props.centerIcon - Icône affichée au centre du donut.
 * @param {"idle"|"playing"|"done"|"disabled"} props.hubIntroState - Etat d'introduction du donut.
 * @returns {JSX.Element}
 */
function SearchChoiceDonut({
  onClick,
  title,
  description,
  cta,
  tone,
  centerIcon,
  hubIntroState,
}) {
  const ctaClass =
    tone === "primary"
      ? "search-hub-donut-choice-cta search-hub-donut-choice-cta-primary"
      : "search-hub-donut-choice-cta search-hub-donut-choice-cta-accent";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative search-hub-donut-choice search-hub-donut-choice-${tone}`}
      data-hub-intro={hubIntroState}
    >
      <div className="search-hub-donut-choice-visual" aria-hidden="true">
        <div className="home-hub-ring-dashed" />
        <div className="home-hub-donut">
          <div className="home-hub-donut-inner" />
        </div>
        <div className="home-hub-core">
          {centerIcon}
        </div>
      </div>

      <div className="search-hub-donut-choice-copy">
        <h2 className="search-hub-donut-choice-title">{title}</h2>
        <p className="search-hub-donut-choice-description">{description}</p>
        <span className={ctaClass}>
          {cta}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </span>
      </div>
    </button>
  );
}

/**
 * Vue d'accueil du hub de recherche CBIR.
 * Présente deux choix de recherche sous forme de donuts interactifs :
 * - La recherche par image (mode visuel/sémantique via upload).
 * - La recherche par texte (mode sémantique via caption).
 *
 * Une animation d'entrée est déclenchée au montage du composant.
 *
 * @component
 * @param {object} props
 * @param {function(): void} props.onChooseImage - Callback pour naviguer vers la recherche par image.
 * @param {function(): void} props.onChooseText - Callback pour naviguer vers la recherche par texte.
 * @returns {JSX.Element}
 *
 */
export default function SearchHubView({ onChooseImage, onChooseText }) {
  
  const { t } = useContext(LangContext);
  const hub = t.search.hub;
  const hubSectionRef = useRef(null);
  /** @type {[boolean, function]} Déclenche les animations d'entrée après le premier rendu */
  const [ready, setReady] = useState(false);
  const [hubIntroState, setHubIntroState] = useState(getInitialHubIntroState);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (
      !HUB_INTRO_ANIMATION.enabled
      || hubIntroState !== "idle"
      || typeof window === "undefined"
      || typeof IntersectionObserver === "undefined"
    ) {
      return undefined;
    }

    const sectionNode = hubSectionRef.current;
    if (!sectionNode) {
      return undefined;
    }

    let observer = null;

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) {
            return;
          }

          setHubIntroState("playing");
          observer?.disconnect();
        },
        {
          threshold: 0.32,
          rootMargin: "0px 0px -10% 0px",
        },
      );

      observer.observe(sectionNode);
    }

    return () => {
      observer?.disconnect();
    };
  }, [hubIntroState]);

  useEffect(() => {
    if (hubIntroState !== "playing" || typeof window === "undefined") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setHubIntroState("done");
    }, HUB_INTRO_TOTAL_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [hubIntroState]);

  return (
    <div className="relative box-border min-h-[calc(100dvh-4rem)] overflow-x-hidden overflow-y-auto bg-transparent px-6 py-8 pb-16 md:min-h-[calc(100dvh-5rem)] md:py-12">
      {/* Cercles décoratifs en arrière-plan */}
      <div className="search-hub-bg-orbs pointer-events-none absolute inset-0 overflow-hidden">
        <div className="search-hub-bg-orb search-hub-bg-orb-primary absolute left-[-8%] top-[10%] h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="search-hub-bg-orb search-hub-bg-orb-accent absolute right-[-6%] top-[20%] h-80 w-80 rounded-full bg-accent/12 blur-3xl" />
        <div className="search-hub-bg-orb search-hub-bg-orb-bottom absolute bottom-[-8%] left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[1120px] flex-col items-center justify-start pt-0 md:pt-14 pb-10">
        {/* En-tête */}
        <section
          className="mb-10 w-full max-w-[760px] text-center md:mb-12"
          style={{
            opacity: ready ? 1 : 0,
            transform: ready ? "translateY(0)" : "translateY(18px)",
            transition: "opacity 520ms cubic-bezier(0.16, 1, 0.3, 1), transform 620ms cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "opacity, transform",
          }}
        >
          <div className="mx-auto mb-5 h-px w-28 rounded-full bg-border/80" />
          <h1 className="search-hub-card-title mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            {hub.headline}
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted">
            {hub.description}
          </p>
        </section>

        {/* Donuts de choix */}
        <div ref={hubSectionRef} className="search-hub-donut-grid">
          <SearchChoiceDonut
            onClick={onChooseImage}
            title={hub.imageCard.title}
            description={hub.imageCard.desc}
            cta={hub.imageCard.cta}
            tone="primary"
            centerIcon={<Eye className="home-hub-core-icon" strokeWidth={1.9} />}
            hubIntroState={hubIntroState}
          />

          <SearchChoiceDonut
            onClick={onChooseText}
            title={hub.textCard.title}
            description={hub.textCard.desc}
            cta={hub.textCard.cta}
            tone="accent"
            centerIcon={<InterpretiveModeIcon className="home-hub-core-icon" />}
            hubIntroState={hubIntroState}
          />
        </div>
      </div>
    </div>
  );
}
