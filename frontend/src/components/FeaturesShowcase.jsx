/** 
 * @fileoverview Section de présentation des fonctionnalités via carousel.
 * @module components/FeaturesShowcase
 */

import { useContext, useEffect, useState } from "react";
import { LangContext } from "../context/LangContextValue";
import FeatureCarousel from "./FeatureCarousel";

/**
 * Section présentant les fonctionnalités du projet via un carousel de cartes.
 * Peut être utilisée en mode standalone ou embarquée dans la HomePage.
 *
 * @component
 * @param {object} props
 * @param {boolean} [props.embedded=false] - Mode embarqué dans la HomePage
 * @returns {JSX.Element}
 */
export default function FeaturesShowcase({ embedded = false }) {
  const { t } = useContext(LangContext);
  const content = t.features;
  /** @type {[boolean, function]} Déclenche les animations d'entrée après le premier frame */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const showcaseCards = content?.showcaseCards ?? [];

  const header = (
    <div className={embedded ? "mb-7 mt-3 md:mb-9 md:mt-4" : "mb-8 md:mb-10 mt-6 md:mt-8"}>
      <h1 className="text-4xl md:text-5xl font-bold text-title tracking-tight mb-3 leading-tight">
        {content?.showcaseEyebrow}
      </h1>
      <div className="w-10 h-0.5 bg-semantic mb-5 rounded" />
      <p className="text-base md:text-lg text-muted max-w-md leading-relaxed">
        {content?.showcaseDescription}
      </p>
    </div>
  );

  const carousel = (
    <div className="features-showcase-carousel-rail">
      <FeatureCarousel
        items={showcaseCards}
        prevLabel={content?.prevLabel}
        nextLabel={content?.nextLabel}
        regionLabel={content?.carouselLabel}
      />
    </div>
  );

  return (
    <div className={`features-page ${embedded ? "features-page-embedded" : "-mt-16 md:-mt-20"}`}>
      <section
        className={`features-showcase-section ${ready ? "by-image-panel-enter-up" : "opacity-0"}`}
        style={{ animationDelay: "0ms" }}
      >
        <div className="features-showcase-shell">
          {embedded ? header : <div className="page-container features-showcase-header">{header}</div>}

          {embedded ? carousel : <div className="page-container features-showcase-carousel-rail">{carousel}</div>}
        </div>
      </section>
    </div>
  );
}
