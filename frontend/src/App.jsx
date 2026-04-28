/**
 * @fileoverview Documentation for App.
 * @module App
 */

import { lazy, Suspense, useState, useEffect, useRef, useContext } from "react";
import { LangProvider } from "./context/LangContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LangContext } from "./context/LangContextValue";
import { useTheme } from "./context/useTheme";
import Navigation from "./components/Navigation";
import HomePage from "./components/HomePage";
import Footer from "./components/Footer";
import Spinner from "./components/Spinner";

// Chargement paresseux des pages secondaires
const SearchPage = lazy(() => import("./components/SearchPage"));
const ContactPage = lazy(() => import("./components/ContactPage"));
const HowItWorks = lazy(() => import("./components/HowItWorks"));
const FAQPage = lazy(() => import("./components/FAQPage"));
const AboutPage = lazy(() => import("./components/AboutPage"));
const PrivacyPage = lazy(() => import("./components/PrivacyPage"));
const LegalPage = lazy(() => import("./components/LegalPage"));

// Preload chunks while idle to speed up navigation
const lazyPagePreloaders = [
  () => import("./components/SearchPage"),
  () => import("./components/ImageSearchView"),
  () => import("./components/TextSearchView"),
  () => import("./components/ContactPage"),
  () => import("./components/HowItWorks"),
  () => import("./components/FAQPage"),
  () => import("./components/AboutPage"),
];

const MOTION_ENTER_DURATION_MS = 620;
const MOTION_ENTER_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
// CSS surfaces applied to the page background for the active route
const HOME_SURFACE = "home-page";
const SEARCH_HUB_SURFACE = "search-hub-surface";
const SEARCH_PRIMARY_SURFACE = "search-primary-surface";
const SEARCH_ACCENT_SURFACE = "search-accent-surface";
const DEFAULT_SURFACE = "bg-bg";
const PAGE_EXIT_DURATION_MS = 240;
const SURFACE_FADE_DURATION_MS = 620;
const SEARCH_PAGE = "search";
const DEFAULT_ROUTE = { page: "home", searchView: "hub" };
const VALID_SEARCH_VIEWS = new Set(["hub", "image", "text"]);
// Default navigation tone for each search view
const SEARCH_VIEW_TONES = {
  hub: "default",
  image: "primary",
  text: "accent",
};

const PAGE_ENTER_TRANSITION =
  `opacity ${MOTION_ENTER_DURATION_MS}ms ${MOTION_ENTER_EASE}, transform ${MOTION_ENTER_DURATION_MS}ms ${MOTION_ENTER_EASE}`;
const PAGE_EXIT_TRANSITION =
  `opacity ${PAGE_EXIT_DURATION_MS}ms ease-out, transform 520ms cubic-bezier(0.4, 0, 1, 1)`;

const PAGE_COMPONENTS = {
  home: HomePage,
  search: SearchPage,
  contact: ContactPage,
  how: HowItWorks,
  faq: FAQPage,
  about: AboutPage,
  privacy: PrivacyPage,
  legal: LegalPage,
};

const STATIC_ROUTE_SURFACES = {
  home: HOME_SURFACE,
  contact: HOME_SURFACE,
  faq: HOME_SURFACE,
};

/**
 * Documentation for App.
 * Return the default route when the page is unknown.
 * @param {string|object} nextRoute
 * @returns {{page: string, searchView: string}
 */
function normalizeRoute(nextRoute) {
  let page = DEFAULT_ROUTE.page;
  let searchView = DEFAULT_ROUTE.searchView;

  if (typeof nextRoute === "string") {
    page = nextRoute;
  } else if (nextRoute?.page) {
    page = nextRoute.page;
    searchView = nextRoute.searchView ?? DEFAULT_ROUTE.searchView;
  }

  if (!PAGE_COMPONENTS[page]) {
    return DEFAULT_ROUTE;
  }

  if (page !== SEARCH_PAGE) {
    return { page, searchView: DEFAULT_ROUTE.searchView };
  }

  return {
    page,
    searchView: VALID_SEARCH_VIEWS.has(searchView)
      ? searchView
      : DEFAULT_ROUTE.searchView,
  };
}

/**
 * Compare two normalized routes.
 * @param {{page: string, searchView: string}} left
 * @param {{page: string, searchView: string}} right
 * @returns {boolean}
 */
function areRoutesEqual(left, right) {
  return left.page === right.page && left.searchView === right.searchView;
}

/**
 * Return the initial chrome tone for a route.
 * @param {{page: string, searchView: string}} route
 * @returns {string}
 */
function getInitialSearchTone(route) {
  return route.page === SEARCH_PAGE
    ? SEARCH_VIEW_TONES[route.searchView] ?? "default"
    : "default";
}

/**
 * Indicate whether the footer should be visible for the current route.
 * @param {{page: string, searchView: string}} route
 * @returns {boolean}
 */
function shouldShowFooter(route) {
  return route.page !== SEARCH_PAGE || route.searchView !== "hub";
}

/**
 * Return the surface CSS class for the route and active search tone.
 * @param {{page: string, searchView: string}} route
 * @param {string} [searchTone="default"]
 * @returns {string}
 */
function getRouteSurface(route, searchTone = "default") {
  if (route.page !== SEARCH_PAGE) {
    return STATIC_ROUTE_SURFACES[route.page] ?? DEFAULT_SURFACE;
  }

  if (route.searchView === "hub") return SEARCH_HUB_SURFACE;
  if (searchTone === "primary") return SEARCH_PRIMARY_SURFACE;
  if (searchTone === "accent") return SEARCH_ACCENT_SURFACE;
  return DEFAULT_SURFACE;
}

/**
 * Fallback displayed while a page is lazy-loading.
 * @returns {JSX.Element}
 */
function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-20">
      <Spinner label="Chargement…" />
    </div>
  );
}

/**
 * Application core that handles routing, page transitions,
 * background surfaces, and chunk preloading.
 *
 * @component
 */
function AppInner() {
  const { langVisible } = useContext(LangContext);
  const { theme } = useTheme();
  const [pageVisible, setPageVisible] = useState(true);
  const [displayRoute, setDisplayRoute] = useState(() =>
    normalizeRoute("home")
  );
  const [navVisible, setNavVisible] = useState(false);
  const [searchTone, setSearchTone] = useState("default");
  const [surfaceOverlay, setSurfaceOverlay] = useState(null);
  const [surfaceOverlayVisible, setSurfaceOverlayVisible] = useState(false);

  const pageTimerRef = useRef(null);
  const preloadTimerRef = useRef(null);
  const preloadIdleRef = useRef(null);
  const bodyLockedRef = useRef(false);
  const surfaceRevealFrameRef = useRef(0);

  /** Verrouille le scroll du body pendant la transition de page */
  function lockBodyScroll() {
    if (bodyLockedRef.current) return;
    const y = window.scrollY;
    if (y <= 0) return;
    document.body.style.position = "fixed";
    document.body.style.top = `-${y}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    bodyLockedRef.current = true;
  }

  /** Unlock scroll and reset the position to 0 when resetScroll is true */
  function clearBodyScrollLock(resetScroll = true) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    bodyLockedRef.current = false;
    if (resetScroll) {
      window.scrollTo(0, 0);
    }
  }

  /** Cancel pending surface reveal frames. */
  function clearSurfaceRevealFrames() {
    cancelAnimationFrame(surfaceRevealFrameRef.current);
    surfaceRevealFrameRef.current = 0;
  }

  /**
  * Navigate to a route with a page transition and surface fade.
  * @param {string|object} nextRouteLike
  */
  function navigateToRoute(nextRouteLike) {
    const nextRoute = normalizeRoute(nextRouteLike);
    const nextSearchTone = getInitialSearchTone(nextRoute);
    const currentSurface = getRouteSurface(displayRoute, searchTone);
    const nextSurface = getRouteSurface(nextRoute, nextSearchTone);

    if (areRoutesEqual(nextRoute, displayRoute)) return;

    lockBodyScroll();
    clearSurfaceRevealFrames();
    if (currentSurface !== nextSurface) {
      setSurfaceOverlay(nextSurface);
      setSurfaceOverlayVisible(false);
      surfaceRevealFrameRef.current = requestAnimationFrame(() => {
        surfaceRevealFrameRef.current = requestAnimationFrame(() => {
          setSurfaceOverlayVisible(true);
        });
      });
    } else {
      setSurfaceOverlay(null);
      setSurfaceOverlayVisible(false);
    }
    setPageVisible(false);
    clearTimeout(pageTimerRef.current);
    pageTimerRef.current = window.setTimeout(() => {
      clearBodyScrollLock(true);
      setSearchTone(nextSearchTone);
      setDisplayRoute(nextRoute);
      setSurfaceOverlay(null);
      setSurfaceOverlayVisible(false);

      requestAnimationFrame(() => setPageVisible(true));
    }, PAGE_EXIT_DURATION_MS);
  }

  /**
   * Navigate to a static page.
   * @param {string} page
   */
  function handlePageChange(page) {
    navigateToRoute(page);
  }

  /**
   * Navigate to a search subview.
   * @param {"hub"|"image"|"text"} searchView
   */
  function handleSearchViewChange(searchView) {
    navigateToRoute({ page: "search", searchView });
  }

  /** Update the tone without causing a re-render when unchanged */
  function handleSearchToneChange(nextTone) {
    setSearchTone((currentTone) =>
      currentTone === nextTone ? currentTone : nextTone
    );
  }

  useEffect(() => {
    const navIntroTimer = window.setTimeout(() => setNavVisible(true), 180);
    /**
     * Preload secondary pages when the browser becomes available.
     */
    const preloadChunks = () => {
      lazyPagePreloaders.forEach((preload) => { preload(); });
    };

    if ("requestIdleCallback" in window) {
      preloadIdleRef.current = window.requestIdleCallback(preloadChunks, { timeout: 1800 });
    } else {
      preloadTimerRef.current = window.setTimeout(preloadChunks, 1200);
    }

    return () => {
      window.clearTimeout(navIntroTimer);
      clearTimeout(pageTimerRef.current);
      window.clearTimeout(preloadTimerRef.current);
      if ("cancelIdleCallback" in window && preloadIdleRef.current) {
        window.cancelIdleCallback(preloadIdleRef.current);
      }
      clearSurfaceRevealFrames();
      setSurfaceOverlay(null);
      setSurfaceOverlayVisible(false);
      clearBodyScrollLock(false);
    };
  }, []);

  const PageComponent = PAGE_COMPONENTS[displayRoute.page] || HomePage;
  const opacity = pageVisible && langVisible ? 1 : 0;
  const translateY = pageVisible ? "0px" : "4px";
  const scale = pageVisible ? 1 : 0.996;
  const currentSurface = getRouteSurface(displayRoute, searchTone);
  const navActiveSurface =
    theme === "dark"
      ? currentSurface === HOME_SURFACE
        ? "var(--page-home-surface-bg)"
        : currentSurface === SEARCH_HUB_SURFACE
          ? "var(--page-search-hub-surface-bg)"
          : "var(--page-default-surface-bg)"
      : null;
  const navTone =
    displayRoute.page === "search" && displayRoute.searchView !== "hub"
      ? searchTone
      : "default";
  const showFooter = shouldShowFooter(displayRoute);
  const pageProps =
    displayRoute.page === SEARCH_PAGE
      ? {
          view: displayRoute.searchView,
          onSearchViewChange: handleSearchViewChange,
          onSearchToneChange: handleSearchToneChange,
        }
      : {
          onPageChange: handlePageChange,
        };

  return (
    <div
      translate="no"
      className="notranslate relative isolate min-h-screen text-text"
      style={{
        ...(navActiveSurface ? { "--nav-active-surface": navActiveSurface } : {}),
        transition: `color ${MOTION_ENTER_DURATION_MS}ms ${MOTION_ENTER_EASE}`,
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${currentSurface}`}
        style={{ transition: "none" }}
      />
      {surfaceOverlay && (
        <div
          className={`pointer-events-none absolute inset-0 ${surfaceOverlay}`}
          style={{
            opacity: surfaceOverlayVisible ? 1 : 0,
            transition: `opacity ${SURFACE_FADE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            willChange: "opacity",
          }}
        />
      )}

      <div className="relative z-10">
        <Navigation
          currentPage={displayRoute.page}
          onPageChange={handlePageChange}
          visible={navVisible}
          tone={navTone}
        />

        <main
          className="pt-0"
          style={{
            opacity,
            transform: `translateY(${translateY}) scale(${scale})`,
            pointerEvents: opacity ? "auto" : "none",
            transition: pageVisible
              ? PAGE_ENTER_TRANSITION
              : PAGE_EXIT_TRANSITION,
            willChange: "opacity, transform",
          }}
        >
          <Suspense fallback={<PageLoader />}>
            <PageComponent {...pageProps} />
          </Suspense>
        </main>

        {showFooter && (
          <div
            style={{
              opacity,
              transform: opacity ? "translateY(0)" : "translateY(18px)",
              pointerEvents: opacity ? "auto" : "none",
              transition: "opacity 280ms ease, transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "opacity, transform",
            }}
          >
            <Footer onPageChange={handlePageChange} />
          </div>
        )}
      </div>

    </div>
  );
}

/**
 * Root application with theme and language providers.
 * @returns {JSX.Element}
 */
export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppInner />
      </LangProvider>
    </ThemeProvider>
  );
}
