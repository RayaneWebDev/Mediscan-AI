import { lazy, Suspense, useState, useEffect, useRef, useContext } from "react";
import { LangProvider } from "./context/LangContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LangContext } from "./context/LangContext";
import Navigation from "./components/Navigation";
import HomePage from "./components/HomePage";
import Footer from "./components/Footer";
import Spinner from "./components/Spinner";

const SearchPage = lazy(() => import("./components/SearchPage"));
const ContactPage = lazy(() => import("./components/ContactPage"));
const HowItWorks = lazy(() => import("./components/HowItWorks"));
const FAQPage = lazy(() => import("./components/FAQPage"));
const AboutPage = lazy(() => import("./components/AboutPage"));

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
const HOME_SURFACE = "home-page";
const SEARCH_HUB_SURFACE = "search-hub-surface";
const DEFAULT_SURFACE = "bg-bg";
const PAGE_EXIT_DURATION_MS = 240;
const SURFACE_FADE_DURATION_MS = 620;

const PAGE_ENTER_TRANSITION =
  `opacity ${MOTION_ENTER_DURATION_MS}ms ${MOTION_ENTER_EASE}, transform ${MOTION_ENTER_DURATION_MS}ms ${MOTION_ENTER_EASE}`;
const PAGE_EXIT_TRANSITION =
  `opacity ${PAGE_EXIT_DURATION_MS}ms ease-out, transform 520ms cubic-bezier(0.4, 0, 1, 1)`;

const pages = {
  home: HomePage,
  search: SearchPage,
  contact: ContactPage,
  how: HowItWorks,
  faq: FAQPage,
  about: AboutPage,
};

function normalizeRoute(nextRoute) {
  if (typeof nextRoute === "string") {
    return nextRoute === "search"
      ? { page: "search", searchView: "hub" }
      : { page: nextRoute, searchView: "hub" };
  }

  if (!nextRoute || !nextRoute.page) {
    return { page: "home", searchView: "hub" };
  }

  return nextRoute.page === "search"
    ? { page: "search", searchView: nextRoute.searchView ?? "hub" }
    : { page: nextRoute.page, searchView: "hub" };
}

function areRoutesEqual(left, right) {
  return left.page === right.page && left.searchView === right.searchView;
}

function getInitialSearchTone(route) {
  if (route.page !== "search") return "default";
  if (route.searchView === "image") return "primary";
  if (route.searchView === "text") return "accent";
  return "default";
}

function shouldShowFooter(route) {
  return route.page !== "search" || route.searchView !== "hub";
}

function getRouteSurface(route) {
  if (route.page === "home") return HOME_SURFACE;
  if (route.page === "contact") return HOME_SURFACE;
  if (route.page !== "search") return DEFAULT_SURFACE;
  if (route.searchView === "hub") return SEARCH_HUB_SURFACE;
  return DEFAULT_SURFACE;
}

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-20">
      <Spinner label="Chargement…" />
    </div>
  );
}

function AppInner() {
  const { langVisible } = useContext(LangContext);
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

  function clearSurfaceRevealFrames() {
    cancelAnimationFrame(surfaceRevealFrameRef.current);
    surfaceRevealFrameRef.current = 0;
  }

  function navigateToRoute(nextRouteLike) {
    const nextRoute = normalizeRoute(nextRouteLike);
    const nextSearchTone = getInitialSearchTone(nextRoute);
    const currentSurface = getRouteSurface(displayRoute);
    const nextSurface = getRouteSurface(nextRoute);

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

  function handlePageChange(page) {
    navigateToRoute(page);
  }

  function handleSearchViewChange(searchView) {
    navigateToRoute({ page: "search", searchView });
  }

  function handleSearchToneChange(nextTone) {
    setSearchTone((currentTone) =>
      currentTone === nextTone ? currentTone : nextTone
    );
  }

  useEffect(() => {
    const navIntroTimer = window.setTimeout(() => setNavVisible(true), 180);
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

  const PageComponent = pages[displayRoute.page] || HomePage;
  const opacity = pageVisible && langVisible ? 1 : 0;
  const translateY = pageVisible ? "0px" : "4px";
  const scale = pageVisible ? 1 : 0.996;
  const currentSurface = getRouteSurface(displayRoute);
  const navTone =
    displayRoute.page === "search" && displayRoute.searchView !== "hub"
      ? searchTone
      : "default";
  const showFooter = shouldShowFooter(displayRoute);
  const pageProps =
    displayRoute.page === "search"
      ? {
          onPageChange: handlePageChange,
          view: displayRoute.searchView,
          onSearchViewChange: handleSearchViewChange,
          onSearchToneChange: handleSearchToneChange,
        }
      : { onPageChange: handlePageChange };

  return (
    <div
      translate="no"
      className="notranslate relative isolate min-h-screen text-text"
      style={{
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

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AppInner />
      </LangProvider>
    </ThemeProvider>
  );
}
