/**
 * @fileoverview Barre de navigation principale de l'application MediScan.
 * @module components/Navigation
 */

import { useContext, useState, useEffect, useRef } from "react";
import { LangContext } from "../context/LangContextValue";
import useDesktopNavVisibility from "../hooks/useDesktopNavVisibility";
import LanguageSelector from "./LanguageSelector";


/**
 * Barre de navigation avec les fonctionnalités suivantes :
 * - **Desktop** : onglets centrés avec indicateur animé de l'onglet actif.
 * - **Mobile** : menu plein écran.
 * - **Scroll** : la navbar se masque lors du scroll vers le bas et réapparaît vers le haut.
 * - **Transparence** : fond transparent au sommet, opaque après défilement.
 *
 * @component
 * @param {object} props
 * @param {string} props.currentPage - Identifiant de la page active
 * @param {function(string): void} props.onPageChange - Callback de navigation vers une autre page.
 * @param {boolean} [props.visible=true] - Contrôle la visibilité forcée de la navbar.
 * @param {"default"|"primary"|"accent"} [props.tone="default"] - Thème visuel de la navbar.
 * @returns {JSX.Element}
 *
 * @example
 * <Navigation
 *   currentPage="search"
 *   onPageChange={(page) => setCurrentPage(page)}
 *   tone="primary"
 * />
 */
export default function Navigation({
  currentPage,
  onPageChange,
  visible = true,
  tone = "default",
}) {
  const { t } = useContext(LangContext);
  /** @type {[boolean, function]} État d'ouverture du menu mobile */
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  /** @type {[{width: number, x: number, opacity: number}, function]} Style CSS de la boîte animée sur l'onglet actif.*/
  const [activeBoxStyle, setActiveBoxStyle] = useState({ width: 0, x: 0, opacity: 0 });
  /** Référence sur le conteneur des onglets pour calculer la position de l'indicateur */
  const shellRef = useRef(null);
  /** Map des références DOM sur chaque bouton d'onglet */
  const tabRefs = useRef({});
  const isDesktopNavVisible = useDesktopNavVisibility({
    enabled: visible,
    forceVisible: isMenuOpen,
  });

  // Bloque le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  /**
   * Navigue vers une page et ferme le menu mobile si ouvert.
   * @param {string} id - Identifiant de la page cible.
  */
  const handlePageChange = (id) => {
    setIsMenuOpen(false); 
    onPageChange(id);
  };

  // Calcul de la position et largeur de l'indicateur d'onglet actif.
  useEffect(() => {
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

  /** @type {Array<{id: string, label: string}>} Onglets de navigation principaux. */
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

            {/* Onglets desktop avec indicateur animé */}
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

            {/* Sélecteur de langue + mobile */}
            <div className="flex items-center gap-4 z-[1300]">
              <div className="hidden md:block scale-90 origin-right">
                <LanguageSelector />
              </div>

              <button 
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)} 
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

      {/* Menu mobile plein écran */}
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
              className="text-left text-[1.3rem] font-medium tracking-tight py-4 transition-opacity active:opacity-40"
              style={{
                color: "var(--palette-text)",
                borderBottom: i < mainTabs.length - 1 ? "1px solid var(--palette-border)" : "none",
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
