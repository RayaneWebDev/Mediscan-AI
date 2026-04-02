import { useState, useEffect, useRef, useContext } from "react";
import { LangProvider } from "./context/LangContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LangContext } from "./context/lang-context";
import Navigation from "./components/Navigation";
import HomePage from "./components/HomePage";
import SearchPage from "./components/SearchPage";
import FeaturesPage from "./components/FeaturesPage";
import ContactPage from "./components/ContactPage";
import HowItWorks from "./components/HowItWorks";
import FAQPage from "./components/FAQPage";
import Footer from './components/Footer';
import AboutPage from "./components/AboutPage";

const PAGE_ENTER_TRANSITION =
  "opacity 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 520ms cubic-bezier(0.16, 1, 0.3, 1)";
const PAGE_EXIT_TRANSITION =
  "opacity 180ms ease-out, transform 220ms cubic-bezier(0.4, 0, 1, 1)";

const pages = {
  home: HomePage,
  search: SearchPage,
  features: FeaturesPage,
  contact: ContactPage,
  how: HowItWorks,
  faq: FAQPage,
  about : AboutPage
};

function AppInner() {
  const { langVisible } = useContext(LangContext);
  const [pageVisible, setPageVisible] = useState(true);
  const [displayPage, setDisplayPage] = useState("home");

  // Keep the header in the layout at all times to avoid content jumps.
  // The footer can still fade out and unmount because it sits below the fold.
  const [navVisible, setNavVisible] = useState(true);
  const [navTone, setNavTone] = useState("default");
  const [footerMounted, setFooterMounted] = useState(true);
  const [footerVisible, setFooterVisible] = useState(true);

  const pageTimerRef = useRef(null);
  const footerTimerRef = useRef(null);

  function pageShowsChrome(page) {
    return true;
  }

  function handleNavVisibility(show) {
    setNavVisible(show);
  }

  function handleFooterVisibility(show) {
    clearTimeout(footerTimerRef.current);

    if (show) {
      setFooterMounted(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setFooterVisible(true))
      );
    } else {
      setFooterVisible(false);
      footerTimerRef.current = setTimeout(() => setFooterMounted(false), 300);
    }
  }

  function handlePageChange(page) {
    if (page === displayPage) return;

    const shouldShowChrome = pageShowsChrome(page);

    // Leaving to the search hub should fade the chrome out with the page.
    // Returning to standard pages should only reveal the chrome once the new
    // content is mounted, which avoids the "appears then disappears" flash.
    if (!shouldShowChrome) {
      handleNavVisibility(false);
    }

    setPageVisible(false);
    clearTimeout(pageTimerRef.current);
    pageTimerRef.current = setTimeout(() => {
      setDisplayPage(page);
      window.scrollTo({ top: 0, behavior: "auto" });

      if (shouldShowChrome) {
        setNavTone("default");
        handleNavVisibility(true);
        handleFooterVisibility(page !== "search");
      }

      requestAnimationFrame(() => setPageVisible(true));
    }, 190);
  }

  useEffect(() => {
    return () => {
      clearTimeout(pageTimerRef.current);
      clearTimeout(footerTimerRef.current);
    };
  }, []);

  const PageComponent = pages[displayPage] || HomePage;
  const opacity = pageVisible && langVisible ? 1 : 0;
  const translateY = pageVisible ? "0px" : "4px";
  const scale = pageVisible ? 1 : 0.996;

  return (
    <div className="min-h-screen bg-bg text-text transition-colors duration-300">
      <Navigation
        currentPage={displayPage}
        onPageChange={handlePageChange}
        visible={navVisible}
        tone={navTone}
      />

      <main
        className="pt-0"
        style={{
          opacity,
          transform: `translateY(${translateY}) scale(${scale})`,
          transition: pageVisible
            ? PAGE_ENTER_TRANSITION
            : PAGE_EXIT_TRANSITION,
          willChange: "opacity, transform",
        }}
      >
        <PageComponent
          onPageChange={handlePageChange}
          onNavVisibility={handleNavVisibility}
          onFooterVisibility={handleFooterVisibility}
          onChromeToneChange={setNavTone}
        />
      </main>

      {footerMounted && (
        <div
          style={{
            opacity: footerVisible ? 1 : 0,
            transform: footerVisible ? "translateY(0)" : "translateY(18px)",
            pointerEvents: footerVisible ? "auto" : "none",
            transition: "opacity 280ms ease, transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
            willChange: "opacity, transform",
          }}
        >
          <Footer onPageChange={handlePageChange} />
        </div>
      )}

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
