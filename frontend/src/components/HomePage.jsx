import {
  BetweenHorizontalStart,
  Blocks,
  Brain,
  FileText,
  HardDrive,
  Hospital,
  Image,
  Microscope,
  Route,
  Search,
  Stethoscope,
  UserKey,
} from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { LangContext } from "../context/lang-context";

const benefitIcons = {
  route: Route,
  "between-horizontal-start": BetweenHorizontalStart,
  brain: Brain,
  "user-key": UserKey,
  "hard-drive": HardDrive,
  blocks: Blocks,
};

const useCaseIcons = {
  stethoscope: Stethoscope,
  microscope: Microscope,
  hospital: Hospital,
  search: Search,
};

function VisualModeIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function InterpretiveModeIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function WhyFeature({ icon, title, description }) {
  return (
    <article className="home-why-column">
      <div className="home-why-icon mb-4">{icon}</div>
      <h3 className="home-why-title mb-3">{title}</h3>
      <p className="home-why-body">{description}</p>
    </article>
  );
}

function RetrievalCard({
  nodeId,
  tone = "neutral",
  label,
  icon,
  className = "",
}) {
  const toneClass =
    tone === "blue"
      ? "home-retrieval-card-blue"
      : tone === "accent"
        ? "home-retrieval-card-accent"
        : "";

  const iconClass =
    tone === "blue"
      ? "home-retrieval-icon-blue"
      : tone === "accent"
        ? "home-retrieval-icon-accent"
        : "";

  const labelClass =
    tone === "blue"
      ? "home-retrieval-label-blue"
      : tone === "accent"
        ? "home-retrieval-label-accent"
        : "";

  return (
    <article
      className={[
        "home-retrieval-card",
        toneClass,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-label={label}
      data-node-id={nodeId}
    >
      <div className="home-retrieval-card-shell">
        <span className={["home-retrieval-icon", iconClass].filter(Boolean).join(" ")}>{icon}</span>
        <p className={["home-retrieval-label", labelClass].filter(Boolean).join(" ")}>{label}</p>
      </div>
    </article>
  );
}

export default function HomePage({ onPageChange }) {
  const { t } = useContext(LangContext);
  const content = t.home;
  const rootLabel = content.modes.rootLabel;
  const visualTitle = content.modes.visual.title;
  const visualLeafLabel = content.modes.visual.items[0];
  const semanticTitle = content.modes.semantic.title;
  const semanticCaseLabel = content.modes.semantic.items[0];
  const semanticTextLabel = content.modes.semantic.items[1];
  const treeRef = useRef(null);
  const [isTreeOpen, setIsTreeOpen] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  });
  const [treeWires, setTreeWires] = useState({
    rootToVisual: {
      path: "",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    },
    rootToSemantic: {
      path: "",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    },
    visualToLeaf: {
      path: "",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    },
    semanticToCase: {
      path: "",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    },
    semanticToText: {
      path: "",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
    },
  });

  useEffect(() => {
    const treeNode = treeRef.current;
    if (!treeNode) {
      return undefined;
    }

    let frameId = 0;

    const updateWires = () => {
      const measureNodeAnchor = (nodeId, side) => {
        const node = treeNode.querySelector(`[data-node-id="${nodeId}"]`);
        if (!node) {
          return null;
        }

        let current = node;
        let x = node.offsetWidth / 2;
        let y = side === "bottom" ? node.offsetHeight : 0;

        while (current && current !== treeNode) {
          x += current.offsetLeft;
          y += current.offsetTop;
          current = current.offsetParent;
        }

        return {
          x,
          y,
        };
      };

      const buildCurve = (start, end, { minCurve = 34, curveFactor = 0.28, startShift = 0.1, endShift = 0.14, endCurveFactor = 0.78 } = {}) => {
        const verticalGap = Math.max(end.y - start.y, 1);
        const deltaX = end.x - start.x;
        const curveDepth = Math.max(minCurve, verticalGap * curveFactor);
        const control1 = {
          x: start.x + deltaX * startShift,
          y: start.y + curveDepth,
        };
        const control2 = {
          x: end.x - deltaX * endShift,
          y: end.y - curveDepth * endCurveFactor,
        };

        return [
          `M ${start.x} ${start.y}`,
          `C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${end.x} ${end.y}`,
        ].join(" ");
      };

      const rootStart = measureNodeAnchor("root", "bottom");
      const visualTop = measureNodeAnchor("visual-parent", "top");
      const visualBottom = measureNodeAnchor("visual-parent", "bottom");
      const visualLeafTop = measureNodeAnchor("visual-leaf", "top");
      const semanticTop = measureNodeAnchor("semantic-parent", "top");
      const semanticBottom = measureNodeAnchor("semantic-parent", "bottom");
      const semanticLeafTop = measureNodeAnchor("semantic-leaf", "top");
      const textLeafTop = measureNodeAnchor("text-leaf", "top");

      if (
        !rootStart ||
        !visualTop ||
        !visualBottom ||
        !visualLeafTop ||
        !semanticTop ||
        !semanticBottom ||
        !semanticLeafTop ||
        !textLeafTop
      ) {
        setTreeWires({
          rootToVisual: {
            path: "",
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
          },
          rootToSemantic: {
            path: "",
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
          },
          visualToLeaf: {
            path: "",
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
          },
          semanticToCase: {
            path: "",
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
          },
          semanticToText: {
            path: "",
            start: { x: 0, y: 0 },
            end: { x: 0, y: 0 },
          },
        });
        return;
      }

      setTreeWires({
        rootToVisual: {
          path: buildCurve(rootStart, visualTop),
          start: rootStart,
          end: visualTop,
        },
        rootToSemantic: {
          path: buildCurve(rootStart, semanticTop),
          start: rootStart,
          end: semanticTop,
        },
        visualToLeaf: {
          path: buildCurve(visualBottom, visualLeafTop, {
            minCurve: 26,
            curveFactor: 0.22,
            startShift: 0,
            endShift: 0,
            endCurveFactor: 0.9,
          }),
          start: visualBottom,
          end: visualLeafTop,
        },
        semanticToCase: {
          path: buildCurve(semanticBottom, semanticLeafTop, {
            minCurve: 26,
            curveFactor: 0.22,
            startShift: 0,
            endShift: 0,
            endCurveFactor: 0.9,
          }),
          start: semanticBottom,
          end: semanticLeafTop,
        },
        semanticToText: {
          path: buildCurve(semanticBottom, textLeafTop, {
            minCurve: 26,
            curveFactor: 0.22,
            startShift: 0,
            endShift: 0,
            endCurveFactor: 0.9,
          }),
          start: semanticBottom,
          end: textLeafTop,
        },
      });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateWires);
    };

    scheduleUpdate();

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(scheduleUpdate) : null;

    resizeObserver?.observe(treeNode);
    treeNode.querySelectorAll("[data-node-id]").forEach((node) => resizeObserver?.observe(node));
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", scheduleUpdate);
      resizeObserver?.disconnect();
    };
  }, [
    rootLabel,
    visualTitle,
    visualLeafLabel,
    semanticTitle,
    semanticCaseLabel,
    semanticTextLabel,
  ]);

  useEffect(() => {
    const treeNode = treeRef.current;
    if (!treeNode || typeof window === "undefined") {
      return undefined;
    }

    const reducedMotionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const handleReducedMotionChange = () => {
      if (reducedMotionQuery?.matches) {
        setIsTreeOpen(true);
      }
    };

    if (reducedMotionQuery?.matches) {
      setIsTreeOpen(true);
      return () => {
        reducedMotionQuery?.removeEventListener?.("change", handleReducedMotionChange);
      };
    }

    let observer = null;

    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) {
            return;
          }

          setIsTreeOpen(true);
          observer?.disconnect();
        },
        {
          threshold: 0.32,
          rootMargin: "0px 0px -10% 0px",
        },
      );

      observer.observe(treeNode);
    } else {
      const openOnMountId = window.setTimeout(() => setIsTreeOpen(true), 160);

      return () => {
        window.clearTimeout(openOnMountId);
        reducedMotionQuery?.removeEventListener?.("change", handleReducedMotionChange);
      };
    }

    reducedMotionQuery?.addEventListener?.("change", handleReducedMotionChange);

    return () => {
      observer?.disconnect();
      reducedMotionQuery?.removeEventListener?.("change", handleReducedMotionChange);
    };
  }, []);

  return (
    <div className="-mt-16 md:-mt-20">
      {/* Hero */}
      <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden pt-16 md:min-h-[calc(100vh-5rem)] md:pt-20">
        <div className="page-container relative h-full">
          <div className="home-hero-stage">
            <div className="home-hero-layout">
              <div className="home-hero-copy">
                <p className="home-hero-label -mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em]">
                  {content.heroLabel}
                </p>
                <h1 className="home-hero-title text-[clamp(2.75rem,6vw,5.5rem)] font-extrabold tracking-[-0.05em]">
                  MEDISCAN AI
                </h1>
                <p className="home-hero-description mt-6 max-w-[560px] text-[clamp(1rem,1.6vw,1.16rem)] leading-relaxed">
                  {content.description}{" "}
                  <span className="home-hero-description-tail">{content.useCases.inlineDescription}</span>
                </p>
                <div className="home-hero-actions mt-8 flex flex-wrap gap-3">
                  <button
                    onClick={() => onPageChange("search")}
                    className="home-hero-button-primary rounded-xl px-8 py-3 text-sm font-semibold"
                  >
                    {content.cta1}
                  </button>
                  <button
                    onClick={() => onPageChange("how")}
                    className="home-hero-button-secondary rounded-xl px-8 py-3 text-sm font-semibold"
                  >
                    {content.cta2}
                  </button>
                </div>
                <div className="home-hero-audience mt-10" aria-label={content.useCases.headline}>
                  <p className="home-hero-audience-heading">{content.useCases.headline}</p>
                  <div className="home-hero-audience-list">
                    {content.useCases.roles.map((role) => {
                      const AudienceIcon = useCaseIcons[role.icon];

                      return (
                        <div key={role.title} className="home-hero-audience-item">
                          {AudienceIcon ? (
                            <span className="home-hero-audience-icon">
                              <AudienceIcon className="h-3.5 w-3.5" strokeWidth={1.8} />
                            </span>
                          ) : null}
                          <span className="home-hero-audience-name">{role.title}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="home-hero-visual" aria-hidden="true">
                <div className="home-hero-spine-shell">
                  <div className="home-hero-spine-glow" />
                  <div className="home-hero-spine-veil" />
                  <img src="/HomeSpine.png" alt="" className="home-hero-spine-image" draggable="false" />
                </div>
              </div>
            </div>
            <div className="home-hero-orb home-hero-orb-left" />
            <div className="home-hero-orb home-hero-orb-right" />
          </div>
        </div>
      </section>

      <section className="page-container home-section home-modes-page">
        <div className="home-modes-page-inner">
          <div className="home-section-header home-section-header-center home-modes-intro">
            <h2 className="home-section-title mb-3">{content.modes.headline}</h2>
            <p className="home-section-description home-section-description-wide home-modes-description">
              {content.modes.description}
            </p>
          </div>

          <div className="home-retrieval-anchor">
          <div
            ref={treeRef}
            className="home-retrieval-branch home-retrieval-tree"
            data-tree-state={isTreeOpen ? "open" : "closed"}
          >
            <svg className="home-retrieval-wire-layer" aria-hidden="true">
              <defs>
                <linearGradient
                  id="home-retrieval-wire-blue"
                  gradientUnits="userSpaceOnUse"
                  x1={treeWires.rootToVisual.start.x}
                  y1={treeWires.rootToVisual.start.y}
                  x2={treeWires.rootToVisual.end.x}
                  y2={treeWires.rootToVisual.end.y}
                >
                  <stop offset="0%" stopColor="var(--tree-wire-neutral)" />
                  <stop offset="18%" stopColor="var(--tree-wire-primary-tint)" />
                  <stop offset="56%" stopColor="var(--tree-wire-primary-mid)" />
                  <stop offset="100%" stopColor="var(--tree-wire-primary-soft)" />
                </linearGradient>

                <linearGradient
                  id="home-retrieval-wire-blue-branch"
                  gradientUnits="userSpaceOnUse"
                  x1={treeWires.visualToLeaf.start.x}
                  y1={treeWires.visualToLeaf.start.y}
                  x2={treeWires.visualToLeaf.end.x}
                  y2={treeWires.visualToLeaf.end.y}
                >
                  <stop offset="0%" stopColor="var(--tree-wire-primary-mid)" />
                  <stop offset="100%" stopColor="var(--tree-wire-primary-soft)" />
                </linearGradient>

                <linearGradient
                  id="home-retrieval-wire-accent"
                  gradientUnits="userSpaceOnUse"
                  x1={treeWires.rootToSemantic.start.x}
                  y1={treeWires.rootToSemantic.start.y}
                  x2={treeWires.rootToSemantic.end.x}
                  y2={treeWires.rootToSemantic.end.y}
                >
                  <stop offset="0%" stopColor="var(--tree-wire-neutral)" />
                  <stop offset="18%" stopColor="var(--tree-wire-accent-tint)" />
                  <stop offset="56%" stopColor="var(--tree-wire-accent-mid)" />
                  <stop offset="100%" stopColor="var(--tree-wire-accent-soft)" />
                </linearGradient>

                <linearGradient
                  id="home-retrieval-wire-accent-branch-case"
                  gradientUnits="userSpaceOnUse"
                  x1={treeWires.semanticToCase.start.x}
                  y1={treeWires.semanticToCase.start.y}
                  x2={treeWires.semanticToCase.end.x}
                  y2={treeWires.semanticToCase.end.y}
                >
                  <stop offset="0%" stopColor="var(--tree-wire-accent-mid)" />
                  <stop offset="100%" stopColor="var(--tree-wire-accent-soft)" />
                </linearGradient>

                <linearGradient
                  id="home-retrieval-wire-accent-branch-text"
                  gradientUnits="userSpaceOnUse"
                  x1={treeWires.semanticToText.start.x}
                  y1={treeWires.semanticToText.start.y}
                  x2={treeWires.semanticToText.end.x}
                  y2={treeWires.semanticToText.end.y}
                >
                  <stop offset="0%" stopColor="var(--tree-wire-accent-mid)" />
                  <stop offset="100%" stopColor="var(--tree-wire-accent-soft)" />
                </linearGradient>
              </defs>

              {treeWires.rootToVisual.path && (
                <>
                  <path
                    d={treeWires.rootToVisual.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-1 home-retrieval-wire-blue-glow"
                  />
                  <path
                    d={treeWires.rootToVisual.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-1 home-retrieval-wire-blue-base"
                  />
                  <path
                    d={treeWires.rootToVisual.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-1 home-retrieval-wire-blue"
                  />
                </>
              )}

              {treeWires.rootToSemantic.path && (
                <>
                  <path
                    d={treeWires.rootToSemantic.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-1 home-retrieval-wire-accent-glow"
                  />
                  <path
                    d={treeWires.rootToSemantic.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-1 home-retrieval-wire-accent-base"
                  />
                  <path
                    d={treeWires.rootToSemantic.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-1 home-retrieval-wire-accent"
                  />
                </>
              )}

              {treeWires.visualToLeaf.path && (
                <>
                  <path
                    d={treeWires.visualToLeaf.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-blue-glow"
                  />
                  <path
                    d={treeWires.visualToLeaf.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-blue-base"
                  />
                  <path
                    d={treeWires.visualToLeaf.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-blue-branch"
                  />
                </>
              )}

              {treeWires.semanticToCase.path && (
                <>
                  <path
                    d={treeWires.semanticToCase.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-accent-glow"
                  />
                  <path
                    d={treeWires.semanticToCase.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-accent-base"
                  />
                  <path
                    d={treeWires.semanticToCase.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-accent-branch"
                    style={{ stroke: "url(#home-retrieval-wire-accent-branch-case)" }}
                  />
                </>
              )}

              {treeWires.semanticToText.path && (
                <>
                  <path
                    d={treeWires.semanticToText.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-accent-glow"
                  />
                  <path
                    d={treeWires.semanticToText.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-accent-base"
                  />
                  <path
                    d={treeWires.semanticToText.path}
                    pathLength={1}
                    className="home-retrieval-wire home-retrieval-wire-stage-2 home-retrieval-wire-accent-branch"
                    style={{ stroke: "url(#home-retrieval-wire-accent-branch-text)" }}
                  />
                </>
              )}
            </svg>

            <div className="home-retrieval-level home-retrieval-level-1">
              <RetrievalCard
                nodeId="root"
                label={rootLabel}
                icon={<Route className="h-4 w-4" strokeWidth={1.8} />}
                className="home-retrieval-card-root"
              />
            </div>

            <div className="home-retrieval-level home-retrieval-level-2 home-retrieval-children">
              <div className="home-retrieval-child-column home-retrieval-branch-slot home-retrieval-branch-slot-blue">
                <RetrievalCard
                  nodeId="visual-parent"
                  tone="blue"
                  label={visualTitle}
                  icon={<VisualModeIcon />}
                  className="home-retrieval-card-parent home-retrieval-card-branch-left"
                />

                <div className="home-retrieval-level home-retrieval-level-3">
                  <RetrievalCard
                  nodeId="visual-leaf"
                  tone="blue"
                  label={visualLeafLabel}
                  icon={<Image className="h-4 w-4" strokeWidth={1.8} />}
                  className="home-retrieval-card-leaf home-retrieval-card-leaf-center"
                />
              </div>
              </div>

              <div className="home-retrieval-child-column home-retrieval-branch-slot home-retrieval-branch-slot-accent">
                <RetrievalCard
                  nodeId="semantic-parent"
                  tone="accent"
                  label={semanticTitle}
                  icon={<InterpretiveModeIcon />}
                  className="home-retrieval-card-parent home-retrieval-card-branch-right"
                />

                <div className="home-retrieval-level home-retrieval-level-3 home-retrieval-leaf-group">
                  <RetrievalCard
                    nodeId="semantic-leaf"
                    tone="accent"
                    label={semanticCaseLabel}
                    icon={<Search className="h-4 w-4" strokeWidth={1.8} />}
                    className="home-retrieval-card-leaf home-retrieval-card-leaf-left"
                  />

                  <RetrievalCard
                    nodeId="text-leaf"
                    tone="accent"
                    label={semanticTextLabel}
                    icon={<FileText className="h-4 w-4" strokeWidth={1.8} />}
                    className="home-retrieval-card-leaf home-retrieval-card-leaf-right"
                  />
                </div>
              </div>
            </div>
          </div>
          </div>

          <div className="home-modes-benefits">
            <div className="home-section-header home-section-header-center home-modes-benefits-header">
              <h3 className="home-subsection-title mb-3">{content.whyChoose.headline}</h3>
              <p className="home-section-description home-section-description-wide">
                {content.whyChoose.description}
              </p>
            </div>

            <div className="home-why-grid home-why-grid-compact grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0">
              {content.whyChoose.features.map((feature, i) => {
                const BenefitIcon = benefitIcons[feature.icon];
                return (
                  <WhyFeature
                    key={i}
                    icon={BenefitIcon ? <BenefitIcon className="w-5 h-5" strokeWidth={1.8} /> : null}
                    title={feature.title}
                    description={feature.desc}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
