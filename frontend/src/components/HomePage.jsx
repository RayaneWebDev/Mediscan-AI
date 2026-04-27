/**
 * @fileoverview Page d'accueil de l'application MediScan CBIR.
 * @module components/HomePage
 */

import {
  Brain,
  BookOpen,
  Eye,
  Hospital,
  Microscope,
  Search,
  Stethoscope,
} from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { LangContext } from "../context/LangContextValue";
import { InterpretiveModeIcon } from "./icons";
import FeaturesShowcase from "./FeaturesShowcase";
import DemosShowcase from "./DemosShowcase";

/** Icon library used in the hub. */
const HUB_ICONS = {
  image: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  clock: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  upload: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  search: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
      <line x1="11" y1="8" x2="11" y2="14" />
    </svg>
  ),
  eye: <Eye className="h-[22px] w-[22px]" strokeWidth={1.8} />,
  text: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5h6" />
      <path d="M15 12h6" />
      <path d="M3 19h18" />
      <path d="m3 12 3.553-7.724a.5.5 0 0 1 .894 0L11 12" />
      <path d="M3.92 10h6.16" />
    </svg>
  ),
  interpretive: <InterpretiveModeIcon className="h-[22px] w-[22px]" />,
  chip: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="3" />
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <line x1="7" y1="2" x2="7" y2="5" /><line x1="12" y1="2" x2="12" y2="5" /><line x1="17" y1="2" x2="17" y2="5" />
      <line x1="7" y1="19" x2="7" y2="22" /><line x1="12" y1="19" x2="12" y2="22" /><line x1="17" y1="19" x2="17" y2="22" />
      <line x1="2" y1="7" x2="5" y2="7" /><line x1="2" y1="12" x2="5" y2="12" /><line x1="2" y1="17" x2="5" y2="17" />
      <line x1="19" y1="7" x2="22" y2="7" /><line x1="19" y1="12" x2="22" y2="12" /><line x1="19" y1="17" x2="22" y2="17" />
    </svg>
  ),
};

/**
 * Decorative organ markers positioned around the hub visual.
 */
const HUB_ORGANS = [
  { style: { top: "-14px", left: "50%", transform: "translateX(-50%)" },    d: "M12 2C8 2 4 6 4 10c0 5 8 12 8 12s8-7 8-12c0-4-4-8-8-8z" },
  { style: { top: "50%", right: "-14px", transform: "translateY(-50%)" },   d: "M8 7c0-3 2-5 4-5s4 2 4 5v10c0 3-2 5-4 5s-4-2-4-5V7z" },
  { style: { bottom: "-14px", left: "50%", transform: "translateX(-50%)" }, d: "M6 9a6 6 0 0 1 12 0c0 6-4 11-6 11S6 15 6 9z" },
  { style: { top: "50%", left: "-14px", transform: "translateY(-50%)" },    d: "M12 2c-2 0-4 3-4 7 0 3 1 5 2 7h4c1-2 2-4 2-7 0-4-2-7-4-7z" },
];

/**
 * Hub cards.
 * position: "tl" | "tr" | "bl" | "br" (CSS grid-area)
 * cardIndex: index in content.hub.cards[]
 */
const HUB_CARDS = [
  { position: "tl", tone: "semantic", icon: "interpretive", cardIndex: 4 }, // 315deg top-left
  { position: "tr", tone: "semantic", icon: "text", cardIndex: 3 }, // 45deg top-right
  { position: "bc", tone: "visual",   icon: "eye",  cardIndex: 0 }, // bottom-center
];

const HUB_INTRO_ANIMATION = {
  enabled: true,
};

const HUB_INTRO_TOTAL_MS = 2400;

/** Map of Lucide icons used by use-case cards. */
const useCaseIcons = {
  stethoscope: Stethoscope,
  microscope: Microscope,
  hospital: Hospital,
  search: Search,
  brain: Brain,
  book: BookOpen,
};

/**
 * Render the MediScan CBIR home page.
 *
 * @component
 * @param {object} props
 * @param {function(string): void} props.onPageChange
 * @returns {JSX.Element}
 */
export default function HomePage({
  onPageChange,
}) {
  const { t } = useContext(LangContext);
  const content = t.home;
  const hubHeadline = content.hub.headline ?? "Recherche medicale";
  const hubDescription =
    content.hub.description ?? "Choisissez l'approche la plus pertinente pour explorer des cas proches.";
  const useCasesSectionRef = useRef(null);
  const demoSectionRef = useRef(null);
  const technologySectionRef = useRef(null);
  const hubSectionRef = useRef(null);
  const hubLayoutRef = useRef(null);
  const hubDonutRef = useRef(null);
  const hubCardRefs = useRef({});
  /** Hub animation state: "idle"|"playing"|"done"|"disabled". */
  const [hubIntroState, setHubIntroState] = useState(() => {
    if (!HUB_INTRO_ANIMATION.enabled) {
      return "disabled";
    }

    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      return "done";
    }

    return "idle";
  });
  /** Dimensions du viewBox SVG des lignes du hub. */
  const [hubViewBox, setHubViewBox] = useState({ width: 1060, height: 640 });
  /** Dotted lines between the donut and cards. */
  const [hubLines, setHubLines] = useState([]);

  // Trigger the hub animation when the section enters the viewport
  useEffect(() => {
    if (!HUB_INTRO_ANIMATION.enabled || hubIntroState !== "idle" || typeof window === "undefined") {
      return undefined;
    }

    const sectionNode = hubSectionRef.current;
    if (!sectionNode) {
      return undefined;
    }

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setHubIntroState("done");
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
    } else {
      setHubIntroState("playing");
    }

    return () => {
      observer?.disconnect();
    };
  }, [hubIntroState]);

  // Switch to "done" after the full animation duration
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

  // Compute and update SVG lines between the donut and cards
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let frameId = 0;

    /**
     * Mesure le hub et reconstruit les lignes SVG reliant le donut aux cartes.
     */
    const updateHubLines = () => {
      const layoutNode = hubLayoutRef.current;
      const donutNode = hubDonutRef.current;

      if (!layoutNode || !donutNode) {
        return;
      }

      const layoutRect = layoutNode.getBoundingClientRect();
      const donutRect = donutNode.getBoundingClientRect();
      const donutCenter = {
        x: donutRect.left + donutRect.width / 2,
        y: donutRect.top + donutRect.height / 2,
      };
      const donutRadiusX = donutRect.width / 2;
      const donutRadiusY = donutRect.height / 2;

      const lineSpecs = [
        {
          card: "tl",
          tone: "semantic",
          cardAnchor: "bottom-center",
          donutAnchor: "radial",
        },
        {
          card: "tr",
          tone: "semantic",
          cardAnchor: "bottom-center",
          donutAnchor: "radial",
        },
        {
          card: "bc",
          tone: "visual",
          cardAnchor: "top-center",
          donutAnchor: "bottom-center",
        },
      ];

      const computed = lineSpecs.map((spec) => {
        const node = hubCardRefs.current[spec.card];
        if (!node) {
          return null;
        }

        const cardRect = node.getBoundingClientRect();
        const cardPoint =
          spec.cardAnchor === "top-center"
            ? {
                x: cardRect.left + cardRect.width / 2,
                y: cardRect.top,
              }
            : {
                x: cardRect.left + cardRect.width / 2,
                y: cardRect.bottom,
              };

        let donutPoint;

        if (spec.donutAnchor === "bottom-center") {
          donutPoint = {
            x: donutCenter.x,
            y: donutRect.bottom,
          };
        } else {
          const dx = cardPoint.x - donutCenter.x;
          const dy = cardPoint.y - donutCenter.y;
          const distance = Math.max(Math.hypot(dx, dy), 1);

          donutPoint = {
            x: donutCenter.x + (dx / distance) * donutRadiusX,
            y: donutCenter.y + (dy / distance) * donutRadiusY,
          };
        }

        return {
          tone: spec.tone,
          x1: donutPoint.x - layoutRect.left,
          y1: donutPoint.y - layoutRect.top,
          x2: cardPoint.x - layoutRect.left,
          y2: cardPoint.y - layoutRect.top,
        };
      }).filter(Boolean);

      setHubViewBox({
        width: Math.max(1, layoutRect.width),
        height: Math.max(1, layoutRect.height),
      });
      setHubLines(computed);
    };

    /**
     * Regroupe les recalculs dans une frame d'animation.
     */
    const scheduleUpdate = () => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
      frameId = requestAnimationFrame(() => {
        frameId = 0;
        updateHubLines();
      });
    };

    scheduleUpdate();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null;

    resizeObserver?.observe(hubLayoutRef.current);
    resizeObserver?.observe(hubDonutRef.current);
    Object.values(hubCardRefs.current).forEach((node) => {
      if (node) resizeObserver?.observe(node);
    });

    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [content.hub.cards, hubIntroState]);


  return (
    <div className="home-page-content -mt-16 md:-mt-20">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 md:min-h-[calc(100vh-5rem)] md:pt-20">
        <div className="page-container relative h-full">
          <div className="home-hero-stage">
            <div className="home-hero-layout">
              <div className="home-hero-copy">
                <h1 className="home-hero-title text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold tracking-[-0.05em]">
                  MEDISCAN AI
                </h1>
                <p className="home-hero-description mt-6 max-w-[560px] text-[clamp(1rem,1.6vw,1.16rem)] leading-relaxed">
                  {content.description}
                </p>
                <div className="home-hero-actions mt-8 w-full" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                  <button
                    onClick={() => onPageChange("search")}
                    className="home-hero-button-primary home-hero-button-scan rounded-xl px-6 py-3 text-[0.82rem] md:text-base font-semibold whitespace-nowrap"
                    style={{ display: "inline-flex", width: "auto" }}
                  >
                    {content.cta1}
                  </button>
                </div>
                <div
                  ref={useCasesSectionRef}
                  className="home-hero-audience mt-10"
                  aria-label={content.useCases.headline}
                >
                  <p className="home-hero-audience-heading">{content.useCases.headline}</p>

                  <div
                    className="home-hero-audience-list"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      marginTop: '12px'
                    }}
                  >
                    {content.useCases.roles.map((role) => {
                      const AudienceIcon = useCaseIcons[role.icon];

                      return (
                        <div
                          key={role.title}
                          className="home-hero-audience-item"
                          style={{ display: 'flex', alignItems: 'center', margin: 0 }}
                        >
                          {AudienceIcon ? (
                            <span className="home-hero-audience-icon">
                              <AudienceIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                            </span>
                          ) : null}
                          <span className="home-hero-audience-name" style={{ fontSize: '0.7rem' }}>
                            {role.title}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                <div className="home-hero-visual" aria-hidden="true">
                  <div className="home-hero-spine-shell">
                    <div className="home-hero-spine-glow" />
                    <div className="home-hero-spine-veil" />
                    <img src="/HomeSpine.png" alt="" className="home-hero-spine-image" draggable="false" />
                  </div>
                </div>
              </div>
            </div>
            <div className="home-hero-orb home-hero-orb-left" />
            <div className="home-hero-orb home-hero-orb-right" />
          </div>
        </div>
      </section>


      {/* ── Hub-and-Spoke Section ── */}
      <section ref={hubSectionRef} className="page-container home-section home-hub-section">
        <div className="home-section-header home-section-header-center mb-4 md:mb-10 px-3 md:px-0">
          <h2 className="home-section-title home-hub-title mb-3">{hubHeadline}</h2>
          <p className="home-section-description home-section-description-wide">{hubDescription}</p>
        </div>
        <div
          className="home-hub-layout"
          ref={hubLayoutRef}
          data-hub-intro={hubIntroState}
        >
          {/* Dynamic dotted lines from donut to cards */}
          <svg
            className="home-hub-lines"
            aria-hidden="true"
            viewBox={`0 0 ${hubViewBox.width} ${hubViewBox.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              {hubLines.map((l, i) => {
                const isVisualLine = l.tone === "visual";
                const startColor = isVisualLine
                  ? "var(--home-hub-line-visual-start, #add2d9)"
                  : "var(--home-hub-line-semantic-start, #cce1e5)";
                const endColor = isVisualLine
                  ? "var(--home-hub-line-visual-end, color-mix(in srgb, #aed2d9 42%, var(--theme-title) 58%))"
                  : "var(--home-hub-line-semantic-end, color-mix(in srgb, #cce1e5 38%, var(--theme-title) 62%))";

                return (
                  <linearGradient
                    key={`hub-line-gradient-${i}`}
                    id={`home-hub-line-gradient-${i}`}
                    gradientUnits="userSpaceOnUse"
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                  >
                    <stop offset="0%" stopColor={startColor} />
                    <stop offset="100%" stopColor={endColor} />
                  </linearGradient>
                );
              })}
            </defs>
            {hubLines.map((l, i) => (
              <line
                key={i}
                x1={l.x1}
                y1={l.y1}
                x2={l.x2}
                y2={l.y2}
                pathLength="1"
                className="home-hub-line"
                style={{ stroke: `url(#home-hub-line-gradient-${i})` }}
              />
            ))}
          </svg>

          {/* Cards generated from HUB_CARDS */}
          {HUB_CARDS.map(({ position, cardIndex, tone, icon }) => (
            <article
              key={position}
              ref={(node) => {
                hubCardRefs.current[position] = node;
              }}
              className={`home-hub-card home-hub-card-${position}`}
            >
              <span
                className={[
                  "home-hub-card-icon",
                  tone === "semantic" ? "home-hub-card-icon-semantic" : "home-hub-card-icon-visual",
                ].join(" ")}
                aria-hidden="true"
              >
                {HUB_ICONS[icon]}
              </span>
              <h3 className="home-hub-card-title">{content.hub.cards[cardIndex].title}</h3>
              <p className="home-hub-card-desc">{content.hub.cards[cardIndex].desc}</p>
            </article>
          ))}

          {/* Centre hub */}
          <div className="home-hub-center">
            {/* Anneau externe */}
            <div className="home-hub-ring-dashed" aria-hidden="true">
            </div>

            {/* Colored donut */}
            <div ref={hubDonutRef} className="home-hub-donut" aria-hidden="true">
              <div className="home-hub-donut-inner" />
            </div>

            <div className="home-hub-core">
              <Brain className="home-hub-core-icon" strokeWidth={1.9} />
            </div>

          </div>

        </div>
      </section>

      <section ref={demoSectionRef} className="page-container home-section home-modes-page">
        <div className="home-modes-page-inner">
          <div
            ref={technologySectionRef}
            className="home-usage-fade-shell"
          >
            <DemosShowcase embedded onNavigate={onPageChange} />
            <FeaturesShowcase embedded />
          </div>

        </div>
      </section>
    </div>
  );
}
