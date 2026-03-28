import { useContext } from "react";
import { LangContext } from "../context/lang-context";
import LanguageSelector from "./LanguageSelector";

export default function Navigation({
  currentPage,
  onPageChange,
  visible = true,
  tone = "default",
}) {
  const { t } = useContext(LangContext);

  const shellToneClass =
    tone === "primary"
      ? "border-primary/20 bg-primary-pale/82 ring-primary/10 shadow-[0_10px_30px_rgba(29,78,216,0.10)]"
      : tone === "accent"
        ? "border-accent/20 bg-accent-pale/82 ring-accent/10 shadow-[0_10px_30px_rgba(13,148,136,0.10)]"
        : "border-border/80 bg-bg/80 ring-white/35 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:ring-white/5";

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
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-10px)",
        pointerEvents: visible ? "auto" : "none",
        transition: "opacity 280ms ease, transform 380ms cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: "opacity, transform",
      }}
    >
      <div className="w-full px-4 md:px-6 lg:px-8">
        <div className="grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 md:h-20">
          <button
            onClick={() => onPageChange("home")}
            className="justify-self-start hover:opacity-95 transition-opacity"
          >
            <img
              src="/Logo-2.svg"
              alt="MediScan AI"
              className="nav-logo h-[clamp(42px,12vw,68px)] w-auto object-contain object-left"
            />
          </button>

          <div
            className={`justify-self-center flex items-center gap-[0.5vw] rounded-2xl border px-[1vw] py-1.5 ring-1 backdrop-blur-lg transition-colors duration-300 ${shellToneClass}`}
          >
            {mainTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onPageChange(tab.id)}
                className={`relative px-[clamp(0.5rem,1.5vw,1.25rem)] py-1.5 text-[clamp(11px,1.2vw,14px)] font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                  ${
                    currentPage === tab.id
                      ? "bg-primary text-white shadow-sm"
                      : "text-muted hover:text-text hover:bg-bg-soft"
                  }`}
              >
                {tab.label}
                {currentPage === tab.id && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
                )}
              </button>
            ))}
          </div>

          <div className="justify-self-end scale-[clamp(0.8,1vw,1)] origin-right">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </nav>
  );
}
