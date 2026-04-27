/**
 * @fileoverview Documentation for components/FeatureCarousel.
 * @module components/FeatureCarousel
 */

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Documentation for components/FeatureCarousel.
 *
 * @component
 * @param {object} props
 * @param {string[]} props.srcs
 * @param {string} props.alt
 * @param {number} [props.interval=2000]
 * @param {number} [props.activeIndex]
 * @param {"cover"|"contain"} [props.fit="cover"]
 * @param {boolean} [props.backdrop=false]
 * @returns {JSX.Element}
 */
function SlideshowImage({
  srcs,
  alt,
  interval = 2000,
  activeIndex,
  fit = "cover",
  backdrop = false,
}) {
  const [index, setIndex] = useState(0);
  const isControlled = typeof activeIndex === "number";
  const visibleIndex = srcs.length > 0
    ? (isControlled ? activeIndex % srcs.length : index)
    : 0;

  useEffect(() => {
    if (isControlled || srcs.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % srcs.length);
    }, interval);
    return () => clearInterval(timer);
  }, [isControlled, srcs.length, interval]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: "1.9rem" }}>
      {srcs.map((src, i) => (
        <div
          key={src}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === visibleIndex ? 1 : 0,
            transition: "opacity 0.6s ease",
          }}
        >
          {backdrop ? (
            <>
              <img
                src={src}
                alt=""
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scale(1.06)",
                  filter: "blur(18px) saturate(0.92) brightness(0.95)",
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.12))",
                }}
              />
            </>
          ) : null}

          <img
            src={src}
            alt={i === 0 ? alt : ""}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: fit,
            }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Documentation for components/FeatureCarousel.
 */
const CARD_ICONS = {
  search: function SearchIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.5-4.5m1.5-5.25a6.75 6.75 0 11-13.5 0 6.75 6.75 0 0113.5 0z" />
      </svg>
    );
  },
  compare: function CompareIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 17h10M5 7l-2 2 2 2M19 15l2 2-2 2" />
      </svg>
    );
  },
  explore: function ExploreIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12s3-6 8.5-6 8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  },
  interpret: function InterpretIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 4.5h9A2.5 2.5 0 0119 7v10a2.5 2.5 0 01-2.5 2.5h-9A2.5 2.5 0 015 17V7a2.5 2.5 0 012.5-2.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 9h7M8.5 12h7M8.5 15h4.5" />
      </svg>
    );
  },
  trace: function TraceIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5h8a2 2 0 012 2v12H6V7a2 2 0 012-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6M9 12h6M9 15h4" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 3h6v3H9z" />
      </svg>
    );
  },
  decision: function DecisionIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    );
  },
  workflow: function WorkflowIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6.5h8M4 17.5h8M12 6.5l2.5-2.5L17 6.5l-2.5 2.5L12 6.5zM12 17.5l2.5-2.5 2.5 2.5-2.5 2.5L12 17.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 6.5v11" />
      </svg>
    );
  },
  upload: function UploadIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    );
  },
  text: function TextIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M15 5h6" />
        <path d="M15 12h6" />
        <path d="M3 19h18" />
        <path d="m3 12 3.553-7.724a.5.5 0 0 1 .894 0L11 12" />
        <path d="M3.92 10h6.16" />
      </svg>
    );
  },
  dual: function DualIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <circle cx="8" cy="12" r="3" />
        <circle cx="16" cy="12" r="3" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 12h2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V5M16 19v-2" />
      </svg>
    );
  },
  filter: function FilterIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <line x1="3" x2="21" y1="6" y2="6" />
        <line x1="3" x2="21" y1="12" y2="12" />
        <line x1="3" x2="21" y1="18" y2="18" />
        <line x1="9" x2="9" y1="3" y2="9" />
        <line x1="15" x2="15" y1="9" y2="15" />
        <line x1="9" x2="9" y1="15" y2="21" />
      </svg>
    );
  },
  relaunch: function RelaunchIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <rect x="4" y="5" width="6" height="6" rx="1.5" />
        <rect x="14" y="5" width="6" height="6" rx="1.5" />
        <rect x="9" y="13" width="6" height="6" rx="1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 8h4M12 11v2" />
      </svg>
    );
  },
  ai: function AIIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
        <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
        <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
        <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
        <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
        <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
        <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
        <path d="M6 18a4 4 0 0 1-1.967-.516" />
        <path d="M19.967 17.484A4 4 0 0 1 18 18" />
      </svg>
    );
  },
  report: function ReportIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    );
  },
  api: function ApiIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" {...props}>
        <circle cx="6" cy="12" r="2" />
        <circle cx="18" cy="7" r="2" />
        <circle cx="18" cy="17" r="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h6M16.2 8.3l-3.7 2.6M16.2 15.7l-3.7-2.6" />
      </svg>
    );
  },
  visual: function VisualIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  },
  semantic: function SemanticIcon(props) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    );
  },
};

/**
 * Trouve la carte la plus proche du bord gauche visible du carousel.
 * @param {HTMLElement} track
 * @returns {number}
 */
function getClosestCardIndex(track) {
  const cards = Array.from(track.querySelectorAll("[data-carousel-index]"));
  if (cards.length === 0) {
    return 0;
  }

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const distance = Math.abs(card.offsetLeft - track.scrollLeft);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}
/**
 * Documentation for components/FeatureCarousel.
 *
 * @component
 * @param {object} props
 * @param {Array<object>} props.items
 * @param {string} [props.prevLabel]
 * @param {string} [props.nextLabel]
 * @param {string} [props.regionLabel]
 * @param {string} [props.tryLabel]
 * @param {function(string): void} [props.onNavigate]
 * @param {boolean} [props.synchronizedImagePlayback=false]
 * @param {number} [props.slideshowInterval=3500]
 * @returns {JSX.Element}
 */
export default function FeatureCarousel({
  items = [],
  prevLabel = "Précédent",
  nextLabel = "Suivant",
  regionLabel = "Carrousel de fonctionnalités",
  tryLabel = "Tester",
  onNavigate,
  synchronizedImagePlayback = false,
  slideshowInterval = 2000,
}) {
  const trackRef = useRef(null);
  const dragStateRef = useRef({
    active: false,
    startX: 0,
    scrollLeft: 0,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  /** Shared slideshow index across all image cards. */
  const [sharedSlideIndex, setSharedSlideIndex] = useState(0);

  const synchronizedSlideCount = items.reduce((largestCount, item) => {
    if (item.type !== "image" || !Array.isArray(item.srcs)) {
      return largestCount;
    }
    return Math.max(largestCount, item.srcs.length);
  }, 0);

  // Slideshow synchronized across all image cards
  useEffect(() => {
    if (!synchronizedImagePlayback || synchronizedSlideCount <= 1) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSharedSlideIndex((currentIndex) => (currentIndex + 1) % synchronizedSlideCount);
    }, slideshowInterval);

    return () => clearInterval(timer);
  }, [synchronizedImagePlayback, synchronizedSlideCount, slideshowInterval]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) {
      return undefined;
    }

    /**
     * Documentation for components/FeatureCarousel.
     */
    const updateActiveIndex = () => {
      setActiveIndex(getClosestCardIndex(track));
    };

    updateActiveIndex();
    track.addEventListener("scroll", updateActiveIndex, { passive: true });
    window.addEventListener("resize", updateActiveIndex);

    return () => {
      track.removeEventListener("scroll", updateActiveIndex);
      window.removeEventListener("resize", updateActiveIndex);
    };
  }, [items.length]);

    /**
   * Documentation for components/FeatureCarousel.
   * @param {number} nextIndex
   */
  const scrollToIndex = useCallback(
    (index) => {
      const track = trackRef.current;
      if (!track) {
        return;
      }

      const nextIndex = Math.max(0, Math.min(index, items.length - 1));
      const target = track.querySelector(`[data-carousel-index="${nextIndex}"]`);

      if (!target) {
        return;
      }

      track.scrollTo({
        left: target.offsetLeft,
        behavior: "smooth",
      });
      setActiveIndex(nextIndex);
    },
    [items.length]
  );

  /** Gestion du drag souris sur le carousel (desktop) */
  const handlePointerDown = useCallback((event) => {
    if (event.pointerType === "touch") {
      return;
    }

    const track = trackRef.current;
    if (!track) {
      return;
    }

    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: track.scrollLeft,
    };

    /**
     * Documentation for components/FeatureCarousel.
     * @param {PointerEvent} moveEvent
     */
    const handlePointerMove = (moveEvent) => {
      if (!dragStateRef.current.active) {
        return;
      }

      track.scrollLeft = dragStateRef.current.scrollLeft - (moveEvent.clientX - dragStateRef.current.startX);
    };

    /**
     * Documentation for components/FeatureCarousel.
     */
    const handlePointerUp = () => {
      dragStateRef.current.active = false;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  }, []);

  /** Redirige le scroll vertical en scroll horizontal sur le carousel */
  const handleWheel = useCallback(
    (event) => {
      const track = trackRef.current;
      if (!track) {
        return;
      }

      const canScrollHorizontally = track.scrollWidth > track.clientWidth + 8;
      if (!canScrollHorizontally) {
        return;
      }

      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        track.scrollLeft += event.deltaY;
      }
    },
    []
  );

  /** Left/right keyboard navigation. */
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollToIndex(activeIndex + 1);
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollToIndex(activeIndex - 1);
      }
    },
    [activeIndex, scrollToIndex]
  );

  return (
    <div className="features-carousel">
      <div className="features-carousel-controls">
        <button
          type="button"
          className="features-carousel-nav"
          onClick={() => scrollToIndex(activeIndex - 1)}
          aria-label={prevLabel}
          disabled={activeIndex === 0}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.5 5.5L8 12l6.5 6.5" />
          </svg>
        </button>

        <div className="features-carousel-dots" aria-label={regionLabel}>
          {items.map((item, index) => {
            const itemName = item.title ?? item.label ?? item.alt ?? `Carte ${index + 1}`;

            return (
              <button
                key={itemName}
                type="button"
                className={`features-carousel-dot ${index === activeIndex ? "is-active" : ""}`}
                onClick={() => scrollToIndex(index)}
                aria-label={`${itemName} (${index + 1}/${items.length})`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            );
          })}
        </div>

        <button
          type="button"
          className="features-carousel-nav"
          onClick={() => scrollToIndex(activeIndex + 1)}
          aria-label={nextLabel}
          disabled={activeIndex === items.length - 1}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 5.5L16 12l-6.5 6.5" />
          </svg>
        </button>
      </div>

      <div
        ref={trackRef}
        className="features-carousel-track features-slider"
        role="region"
        aria-label={regionLabel}
        aria-roledescription="carousel"
        onPointerDown={handlePointerDown}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {items.map((item, index) => {
          if (item.type === "image") {
            return (
              <div
                key={item.alt ?? index}
                data-carousel-index={index}
                className="feature-spotlight-item demo-spotlight-item"
                aria-label={`${index + 1} sur ${items.length}${item.label ? ` : ${item.label}` : ""}`}
              >
                <article className={`feature-spotlight-card demo-spotlight-card ${index === activeIndex ? "is-active" : ""}`}>
                  {item.srcs ? (
                    <SlideshowImage
                      key={item.srcs.join("|")}
                      srcs={item.srcs}
                      alt={item.alt ?? ""}
                      interval={item.interval ?? 2000}
                      activeIndex={synchronizedImagePlayback ? sharedSlideIndex : undefined}
                      fit={item.imageFit ?? "cover"}
                      backdrop={item.imageBackdrop === true}
                    />
                  ) : item.src ? (
                    <img
                      src={item.src}
                      alt={item.alt ?? ""}
                      className="demo-spotlight-img"
                      style={{ objectFit: item.imageFit ?? "cover" }}
                    />
                  ) : (
                    <div className="demo-spotlight-placeholder" aria-label={item.alt ?? "Demo"} />
                  )}
                </article>
                {(item.label || item.desc || onNavigate) && (
                  <div className="feature-spotlight-meta">
                    {item.label && <h3 className="feature-spotlight-title">{item.label}</h3>}
                    {item.desc && <p className="feature-spotlight-description feature-spotlight-description-below">{item.desc}</p>}
                    {onNavigate && (
                      <button
                        type="button"
                        className="home-hero-button-primary home-hero-button-scan rounded-lg px-3 py-1.5 text-[0.75rem] font-semibold whitespace-nowrap demo-try-btn"
                        style={{ display: "inline-flex", width: "auto" }}
                        onClick={() => onNavigate("search")}
                      >
                        {tryLabel}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          }

          const Icon = CARD_ICONS[item.icon] ?? CARD_ICONS.search;

          return (
            <div
              key={item.title}
              data-carousel-index={index}
              className="feature-spotlight-item"
              aria-label={`${index + 1} sur ${items.length} : ${item.title}`}
            >
              <article className={`feature-spotlight-card ${index === activeIndex ? "is-active" : ""}`}>
                <div className="feature-spotlight-head">
                  <span className="feature-spotlight-icon feature-spotlight-icon-emphasis">
                    <Icon className="feature-spotlight-icon-svg" />
                  </span>
                </div>
              </article>

              <div className="feature-spotlight-meta">
                <h3 className="feature-spotlight-title">{item.title}</h3>
                <p className="feature-spotlight-description feature-spotlight-description-below">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
