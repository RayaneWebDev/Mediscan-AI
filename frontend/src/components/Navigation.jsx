/**
 * @fileoverview Main navigation bar for the MediScan application.
 * @module components/Navigation
 */

import { useContext, useState, useEffect, useRef } from "react";
import { LangContext } from "../context/LangContextValue";
import useDesktopNavVisibility from "../hooks/useDesktopNavVisibility";
import LanguageSelector from "./LanguageSelector";

// Match the page-exit duration closely so the mobile menu covers the old page
// without making taps feel delayed.
const MOBILE_MENU_ROUTE_CLOSE_DELAY_MS = 245;

/**
 * Render the main navigation bar.
 *
 * The component owns mobile-menu locking, active-tab measurement, scroll-aware
 * desktop visibility, and tone-aware transparency while search views change mode.
 *
 *
 * @component
 * @param {object} props
 * @param {string} props.currentPage
 * @param {function(string): void} props.onPageChange
 * @param {boolean} [props.visible=true]
 * @param {"default"|"primary"|"accent"} [props.tone="default"]
 * @returns {JSX.Element}
 *
 */
export default function Navigation({
  currentPage,
  onPageChange,
  visible = true,
  tone = "default",
}) {
  const { t } = useContext(LangContext);
  /** Mobile menu open state. */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  /** Mobile route selected while the page transition is covered by the menu. */
  const [pendingMobilePage, setPendingMobilePage] = useState(null);
  /** CSS style for the animated active-tab box. */
  const [activeBoxStyle, setActiveBoxStyle] = useState({ width: 0, x: 0, opacity: 0 });
  /** Tab container reference used to compute indicator position. */
  const shellRef = useRef(null);
  /** Map of DOM references for each tab button. */
  const tabRefs = useRef({});
  /** Timer used to keep the mobile menu covering page transitions. */
  const mobileMenuCloseTimerRef = useRef(null);
  const isDesktopNavVisible = useDesktopNavVisibility({
    enabled: visible,
    forceVisible: isMenuOpen,
  });

  /** Cancel a pending delayed mobile-menu close. */
  function clearMobileMenuCloseTimer() {
    window.clearTimeout(mobileMenuCloseTimerRef.current);
    mobileMenuCloseTimerRef.current = null;
    setPendingMobilePage(null);
  }

  // Lock body scrolling while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  /**
   * Navigate to a page and close the mobile menu when it is open.
   * @param {string} id - Target page identifier.
  */
  const handlePageChange = (id) => {
    clearMobileMenuCloseTimer();

    if (isMenuOpen && id !== currentPage) {
      setPendingMobilePage(id);
      onPageChange(id);
      // Close after the route swap so the user sees menu -> new page, not
      // menu -> old page -> new page.
      mobileMenuCloseTimerRef.current = window.setTimeout(() => {
        setIsMenuOpen(false);
        setPendingMobilePage(null);
        mobileMenuCloseTimerRef.current = null;
      }, MOBILE_MENU_ROUTE_CLOSE_DELAY_MS);
      return;
    }

    setIsMenuOpen(false);
    onPageChange(id);
  };

  useEffect(() => {
    return () => {
      window.clearTimeout(mobileMenuCloseTimerRef.current);
    };
  }, []);

  // Measure the active tab indicator position and width.
  useEffect(() => {
    /** Measure the active tab and update the animated indicator. */
    function updateActiveBox() {
      const shell = shellRef.current;
      const activeTab = tabRefs.current[currentPage];

      if (!shell || !activeTab) {
        setActiveBoxStyle({ width: 0, x: 0, opacity: 0 });
        return;
      }

      const offset = activeTab.getBoundingClientRect().left - shell.getBoundingClientRect().left;

      setActiveBoxStyle({
        width: activeTab.offsetWidth,
        x: offset,
        opacity: 1,
      });
    }

    updateActiveBox();

    const timer = setTimeout(updateActiveBox, 100);

    window.addEventListener("resize", updateActiveBox);
    return () => {
      window.removeEventListener("resize", updateActiveBox);
      clearTimeout(timer);
    };
  }, [currentPage, t.nav]);

  const show = visible && isDesktopNavVisible;

  const shellToneClass =
    tone === "primary"
      ? "nav-shell nav-shell-primary"
      : tone === "accent"
        ? "nav-shell nav-shell-accent"
        : "nav-shell nav-shell-default";

  /** Onglets de navigation principaux. */
  const mainTabs = [
    { id: "home", label: t.nav.home },
    { id: "search", label: t.nav.scan },
    { id: "contact", label: t.nav.contact },
    { id: "about", label: t.nav.aboutUs },
  ];

  return (
    <>
      <nav
        className="sticky top-0 z-[9999] w-full transition-all duration-300"
        style={{
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(-100%)",
          background: "transparent",
          pointerEvents: show ? "auto" : "none",
        }}
      >
        <div className="relative z-[1200] w-full px-6">
          <div className="flex h-16 items-center justify-between md:grid md:h-20 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4 lg:px-8">

            {/* Logo */}
            <button type="button" onClick={() => handlePageChange("home")} className="z-[1300] outline-none">
              <img src="/Logo-2.svg" alt="LOGO" className="h-8 md:h-10 w-auto object-contain" />
            </button>

            {/* Desktop tabs with animated indicator */}
            <div ref={shellRef} className={`hidden md:flex nav-shell-track justify-self-center items-center gap-[0.5vw] overflow-hidden rounded-2xl px-[1vw] py-1.5 ${shellToneClass}`}>
              <div
                aria-hidden="true"
                className="nav-active-indicator"
              style={{
                  position: 'absolute',
                  left: 0,
                  opacity: activeBoxStyle.opacity,
                  width: `${activeBoxStyle.width}px`,
                  transform: `translateX(${activeBoxStyle.x}px)`,
                }}
              />
              {mainTabs.map((tab) => (
                <button type="button" key={tab.id} ref={(node) => { tabRefs.current[tab.id] = node; }} onClick={() => handlePageChange(tab.id)} className={`nav-tab relative z-10 px-5 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap ${currentPage === tab.id ? "nav-tab-active" : "nav-tab-inactive"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Language selector and mobile controls */}
            <div className="flex items-center gap-4 z-[1300]">
              <div className="hidden md:block scale-90 origin-right">
                <LanguageSelector />
              </div>

              <button
                type="button"
                onClick={() => {
                  clearMobileMenuCloseTimer();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="md:hidden flex flex-col justify-center items-center w-6 h-6 relative outline-none"
              >
                <span className="block h-[1.5px] absolute transition-all duration-300"
                  style={{ width: '20px', backgroundColor: "var(--palette-text)", transform: isMenuOpen ? 'rotate(45deg)' : 'translateY(-6px)' }} />
                <span className="block h-[1.5px] transition-all duration-300"
                  style={{ width: '20px', backgroundColor: "var(--palette-text)", opacity: isMenuOpen ? 0 : 1 }} />
                <span className="block h-[1.5px] absolute transition-all duration-300"
                  style={{ width: '20px', backgroundColor: "var(--palette-text)", transform: isMenuOpen ? 'rotate(-45deg)' : 'translateY(6px)' }} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Fullscreen mobile menu */}
      <div
        className={`md:hidden fixed inset-0 z-[9998] transition-all duration-300 ${
          isMenuOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        style={{
          background: "var(--nav-active-surface, var(--nav-active-bg, var(--palette-bg)))",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
        }}
      >
        <div className="flex flex-col pt-20 px-6 h-full pb-10">

          {mainTabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => handlePageChange(tab.id)}
              className="text-left text-[1.3rem] font-medium tracking-tight py-4 transition-all duration-150 active:opacity-40"
              style={{
                color: pendingMobilePage === tab.id ? "var(--palette-title, var(--palette-text))" : "var(--palette-text)",
                borderBottom: i < mainTabs.length - 1 ? "1px solid var(--palette-border)" : "none",
                opacity: pendingMobilePage && pendingMobilePage !== tab.id ? 0.42 : 1,
                transform: pendingMobilePage === tab.id ? "translateX(6px)" : "translateX(0)",
              }}
            >
              {tab.label}
            </button>
          ))}

          <div
            className="flex items-center justify-between mt-8 pt-5"
            style={{ borderTop: "1px solid var(--palette-border)" }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--palette-muted)" }}>
              {t.nav.settings || "Settings"}
            </span>
            <LanguageSelector />
          </div>

        </div>
      </div>
    </>
  );
}
