import { useState, useRef, useEffect } from "react";
import SearchHubView from "./SearchHubView";
import ImageSearchView from "./ImageSearchView";
import TextSearchView from "./TextSearchView";

export default function SearchPage({ onNavVisibility, onFooterVisibility, onChromeToneChange }) {
  const [view, setView]       = useState("hub");
  const [visible, setVisible] = useState(true);
  // navBg is updated at t=0 so the background behind the nav starts
  // transitioning at the same time as the content fades out — no lag.
  const [navBg, setNavBg]     = useState("bg-bg");
  const timer = useRef(null);

  const VIEW_TO_BG = { hub: "bg-bg", image: "bg-primary-pale", text: "bg-accent-pale" };
  const TONE_TO_BG = { default: "bg-bg", primary: "bg-primary-pale", accent: "bg-accent-pale" };

  function handleToneChange(tone) {
    setNavBg(TONE_TO_BG[tone] ?? "bg-bg");
    onChromeToneChange?.(tone);
  }

  // On mount: hub state (nav visible, footer hidden, no scroll)
  useEffect(() => {
    onNavVisibility?.(true);
    onFooterVisibility?.(false);
    handleToneChange("default");
    document.body.style.overflow = "hidden";

    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.body.style.overflow = "";
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function navigate(nextView) {
    if (nextView === view) return;
    if (timer.current) clearTimeout(timer.current);

    // ← t=0 : background and chrome tone start transitioning immediately,
    //   in sync with the content fade-out (not after the swap).
    setNavBg(VIEW_TO_BG[nextView]);
    if (nextView === "hub") {
      onFooterVisibility?.(false);
      handleToneChange("default");
    }

    setVisible(false);

    timer.current = setTimeout(() => {
      setView(nextView);
      window.scrollTo({ top: 0, behavior: "auto" });

      if (nextView === "hub") {
        document.body.style.overflow = "hidden";
      } else {
        onFooterVisibility?.(true);
        handleToneChange(nextView === "text" ? "accent" : "primary");
        document.body.style.overflow = "";
      }

      setVisible(true);
    }, 160);
  }

  const views = {
    hub:   <SearchHubView   onChooseImage={() => navigate("image")} onChooseText={() => navigate("text")} />,
    image: <ImageSearchView onBack={() => navigate("hub")} onChromeToneChange={handleToneChange} />,
    text:  <TextSearchView  onBack={() => navigate("hub")} onChromeToneChange={handleToneChange} />,
  };

  return (
    // -mt pulls the wrapper up behind the sticky nav; pt restores the inner space.
    // The background colour is kept in sync with the active view's gradient start.
    <div className={`-mt-16 md:-mt-20 pt-16 md:pt-20 transition-colors duration-200 ${navBg}`}>
      <div
        style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? "translateY(0)" : "translateY(8px)",
          transition: visible
            ? "opacity 320ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1)"
            : "opacity 150ms ease-in, transform 150ms ease-in",
        }}
      >
        {views[view]}
      </div>
    </div>
  );
}
