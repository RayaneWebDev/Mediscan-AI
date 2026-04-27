/**
 * @fileoverview Documentation for components/DemosShowcase.
 * @module components/DemosShowcase
 */

import { useContext, useEffect, useState } from "react";
import { LangContext } from "../context/LangContextValue";
import { useTheme } from "../context/useTheme";
import FeatureCarousel from "./FeatureCarousel";

/**
 * Documentation for components/DemosShowcase.
 */
const DEMO_IMAGE_SETS = [
  {
    light: ["/Day_visual_1.png", "/Day_visual_2.png", "/Day_visual_3.png"],
    dark: ["/Dark_visual_1.png", "/Dark_visual_2.png", "/Dark_visual_3.png"],
  },
  {
    light: ["/Day_interp_1.png", "/Day_interp_2.png", "/Day_interp_3.png"],
    dark: ["/Dark_Interp_1.png", "/Dark_interp_2.png", "/Dark_interp_3.png"],
  },
  {
    light: ["/Day_texte_1.png", "/Day_texte_2.png", "/Day_text_3.png"],
    dark: ["/Dark_texte_1.png", "/Dark_texte_2.png", "/Dark_texte_3.png"],
  },
];


/**
 * Documentation for components/DemosShowcase.
 *
 * @component
 * @param {object} props
 * @param {boolean} [props.embedded=false]
 * @param {function(string): void} [props.onNavigate]
 * @returns {JSX.Element}
 */
export default function DemosShowcase({ embedded = false, onNavigate }) {
  const { t } = useContext(LangContext);
  const { theme } = useTheme();
  const content = t.demos;
  /** Trigger entry animations after the first frame. */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  /** Demo cards enriched with images for the active theme. */
  const demoCards = (content?.demoCards ?? [])
    .slice(0, DEMO_IMAGE_SETS.length)
    .map((card, index) => ({
      ...card,
      srcs: theme === "dark" ? DEMO_IMAGE_SETS[index].dark : DEMO_IMAGE_SETS[index].light,
      imageFit: "contain",
      imageBackdrop: true,
      interval: 3500,
    }));

  const header = (
    <div className="mb-8 md:mb-10 mt-6 md:mt-8 px-2 md:px-0">
      <h1 className="text-4xl md:text-5xl font-bold text-title tracking-tight mb-3 leading-tight">
        {content?.demoEyebrow}
      </h1>
      <div className="w-10 h-0.5 bg-semantic mb-5 rounded" />
      <p className="text-base md:text-lg text-muted max-w-md leading-relaxed">
        {content?.demoDescription}
      </p>
    </div>
  );

  const carousel = (
    <div className="features-showcase-carousel-rail">
      <FeatureCarousel
        items={demoCards}
        prevLabel={content?.prevLabel}
        nextLabel={content?.nextLabel}
        regionLabel={content?.carouselLabel}
        tryLabel={content?.tryLabel}
        onNavigate={onNavigate}
        synchronizedImagePlayback
        slideshowInterval={3500}
      />
    </div>
  );

  return (
    <div className={`features-page ${embedded ? "features-page-embedded demos-page-embedded" : "-mt-16 md:-mt-20"}`}>
      <section
        className={`features-showcase-section demos-showcase-section ${ready ? "by-image-panel-enter-up" : "opacity-0"}`}
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
