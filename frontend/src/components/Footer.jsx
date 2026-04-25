/** 
 * @fileoverview Pied de page de l'application MediScan.
 * @module components/Footer
 */

import { useContext } from "react";
import { LangContext } from "../context/LangContextValue";

/**
 * Icône GitHub en SVG.
 * @component
 * @param {object} props
 * @param {string} [props.className=""]
 * @returns {JSX.Element}
 */
function GitHubMark({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58l-.02-2.04c-3.34.73-4.04-1.41-4.04-1.41A3.18 3.18 0 0 0 3.64 18c-1.09-.75.08-.73.08-.73a2.52 2.52 0 0 1 1.84 1.24 2.57 2.57 0 0 0 3.5 1 2.58 2.58 0 0 1 .77-1.61c-2.66-.3-5.46-1.33-5.46-5.91a4.63 4.63 0 0 1 1.23-3.21 4.3 4.3 0 0 1 .12-3.16s1-.32 3.3 1.23a11.4 11.4 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23a4.3 4.3 0 0 1 .12 3.16 4.62 4.62 0 0 1 1.23 3.21c0 4.59-2.81 5.61-5.48 5.91a2.9 2.9 0 0 1 .82 2.25l-.01 3.33c0 .32.21.7.82.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

/**
 * Pied de page avec colonnes de navigation, support, mentions légales et lien GitHub.
 *
 * @component
 * @param {object} props
 * @param {function(string): void} props.onPageChange - Callback de navigation vers une page
 * @returns {JSX.Element}
 */
export default function Footer({ onPageChange }) {
  const { t } = useContext(LangContext);
  const content = t.home;
  const nav = t.nav || {};
  const f = content.footer || {};
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-footer text-on-strong mt-auto">
      <div className="max-w-[1320px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pt-14 pb-8">

        {/* ── Corps principal : logo gauche + colonnes droite ── */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-10 lg:gap-16 mb-12">

          {/* Logo */}
          <div className="flex-shrink-0">
            <button
              type="button"
              onClick={() => onPageChange("home")}
              className="flex items-center group"
            >
              <img src="/Logo-2.svg" alt="MediScan" className="h-8 w-auto group-hover:opacity-70 transition-opacity duration-200" />
            </button>
          </div>

          {/* Colonnes de liens :
              mobile  → 2 colonnes
              sm+     → 4 colonnes
          */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-10 flex-1">

            {/* Navigation */}
            <div>
              <h4 className="text-xs font-semibold text-on-strong uppercase tracking-widest mb-4">
                {f.navigationTitle || "Navigation"}
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: nav.home    || "Accueil",        page: "home"     },
                  { label: nav.scan    || "Scan & Chercher", page: "search"   },
                  { label: nav.aboutUs || "À propos",        page: "about"    },
                ].map(({ label, page }) => (
                  <li key={page}>
                    <button
                      type="button"
                      onClick={() => onPageChange(page)}
                      className="text-sm text-footer-muted hover:text-on-strong transition-colors duration-200 text-left"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-xs font-semibold text-on-strong uppercase tracking-widest mb-4">
                {f.supportTitle || "Support"}
              </h4>
              <ul className="flex flex-col gap-3">
                {[
                  { label: f.aboutus || "À propos",  page: "about"   },
                  { label: f.contact || "Contact",   page: "contact" },
                  { label: f.faq     || "FAQ",       page: "faq"     },
                ].map(({ label, page }) => (
                  <li key={page}>
                    <button
                      type="button"
                      onClick={() => onPageChange(page)}
                      className="text-sm text-footer-muted hover:text-on-strong transition-colors duration-200 text-left"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Mentions légales */}
            <div>
              <h4 className="text-xs font-semibold text-on-strong uppercase tracking-widest mb-4">
                {f.legalTitle || "Mentions légales"}
              </h4>
              <ul className="flex flex-col gap-3">
                <li>
                  <span className="text-sm text-footer-muted opacity-50 cursor-default select-none">
                    {f.privacy || "Confidentialité"}
                  </span>
                </li>
                <li>
                  <span className="text-sm text-footer-muted opacity-50 cursor-default select-none">
                    {f.terms || "Mentions légales"}
                  </span>
                </li>
              </ul>
            </div>

            {/* Liens */}
            <div>
              <h4 className="text-xs font-semibold text-on-strong uppercase tracking-widest mb-4">
                {f.connectTitle || "Liens"}
              </h4>
              <a
                href="https://github.com/MediscanAi-cbir/mediscan-cbir"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-footer-muted hover:text-on-strong transition-colors duration-200 group"
              >
                <GitHubMark className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform duration-200" />
                <span>GitHub</span>
              </a>
            </div>

          </div>
        </div>

        {/* ── Bas de page ── */}
        <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs text-footer-muted">
          <p>© {currentYear} MEDISCAN AI. {f.rights || "Tous droits réservés."}</p>
          <span className="opacity-50 tracking-wide">
            {f.compliance || "Usage recherche uniquement · Non clinique"}
          </span>
        </div>

      </div>
    </footer>
  );
}
