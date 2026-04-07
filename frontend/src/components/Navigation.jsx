import { useContext, useState, useEffect, useRef } from "react";
import { LangContext } from "../context/lang-context";
import LanguageSelector from "./LanguageSelector";

export default function Navigation({
  currentPage,
  onPageChange,
  visible = true,
  tone = "default",
}) {
  const { t } = useContext(LangContext);
  const [scrollHidden, setScrollHidden] = useState(false);
  const [activeBoxStyle, setActiveBoxStyle] = useState({ width: 0, x: 0, opacity: 0 });
  const lastY = useRef(0);
  const turnY = useRef(0);
  const goingDown = useRef(true);
  const shellRef = useRef(null);
  const tabRefs = useRef({});

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const down = y > lastY.current;

      if (down !== goingDown.current) {
        turnY.current = lastY.current;
        goingDown.current = down;
      }

      if (down && y > 300) setScrollHidden(true);
      if (!down && turnY.current - y > 60) setScrollHidden(false);
      if (y <= 10) setScrollHidden(false);

      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    lastY.current = window.scrollY;
    turnY.current = window.scrollY;
    goingDown.current = true;
  }, [currentPage]);

  useEffect(() => {
    function updateActiveBox() {
      const shell = shellRef.current;
      const activeTab = tabRefs.current[currentPage];

      if (!shell || !activeTab) {
        setActiveBoxStyle((prev) => ({ ...prev, opacity: 0 }));
        return;
      }

      setActiveBoxStyle({
        width: activeTab.offsetWidth,
        x: activeTab.offsetLeft,
        opacity: 1,
      });
    }

    updateActiveBox();
    window.addEventListener("resize", updateActiveBox);

    return () => window.removeEventListener("resize", updateActiveBox);
  }, [currentPage, t.nav.home, t.nav.scan, t.nav.features, t.nav.contact, t.nav.aboutUs]);

  const show = visible && !scrollHidden;

  const shellToneClass =
    tone === "primary"
      ? "nav-shell nav-shell-primary"
      : tone === "accent"
        ? "nav-shell nav-shell-accent"
        : "nav-shell nav-shell-default";

  const mainTabs = [
    { id: "home", label: t.nav.home },
    { id: "search", label: t.nav.scan },
    { id: "how", label: t.nav.features },
    { id: "contact", label: t.nav.contact },
    { id: "about", label: t.nav.aboutUs },
  ];

  return (
    <nav
      className="sticky top-0 z-50 bg-transparent"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(-100%)",
        pointerEvents: show ? "auto" : "none",
        transition: "opacity 500ms ease, transform 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "opacity, transform",
      }}
    >
      <div className="nav-outer w-full px-4 md:px-6 lg:px-8">
        <div className="nav-grid grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 md:h-20">
          <button
            onClick={() => onPageChange("home")}
            className="nav-brand justify-self-start hover:opacity-95 transition-opacity"
          >
            <img
              src="/Logo-2.svg"
              alt="MEDISCAN AI"
              className="nav-logo h-[clamp(32px,8vw,48px)] w-auto object-contain object-left"
            />
          </button>

          <div
            ref={shellRef}
            className={`nav-shell-track justify-self-center flex items-center gap-[0.5vw] overflow-hidden rounded-2xl px-[1vw] py-1.5 ${shellToneClass}`}
            style={{
              transition:
                "background-color var(--motion-enter-duration) var(--motion-enter-ease), border-color var(--motion-enter-duration) var(--motion-enter-ease), box-shadow var(--motion-enter-duration) var(--motion-enter-ease)",
            }}
          >
            <div
              aria-hidden="true"
              className="nav-active-indicator"
              style={{
                width: `${activeBoxStyle.width}px`,
                transform: `translate3d(${activeBoxStyle.x}px, 0, 0)`,
                opacity: activeBoxStyle.opacity,
              }}
            />

            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                ref={(node) => {
                  tabRefs.current[tab.id] = node;
                }}
                onClick={() => onPageChange(tab.id)}
                className={`nav-tab relative z-10 px-[clamp(0.5rem,1.5vw,1.25rem)] py-1.5 text-[clamp(11px,1.2vw,14px)] font-medium rounded-lg whitespace-nowrap
                  ${
                    currentPage === tab.id
                      ? "nav-tab-active"
                      : "nav-tab-inactive"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="nav-settings justify-self-end scale-[clamp(0.8,1vw,1)] origin-right">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </nav>
  );
}
