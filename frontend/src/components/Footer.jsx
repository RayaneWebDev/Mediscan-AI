import { useContext } from "react";
import { LangContext } from "../context/lang-context";

function GitHubMark({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
      className={className}
    >
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58l-.02-2.04c-3.34.73-4.04-1.41-4.04-1.41A3.18 3.18 0 0 0 3.64 18c-1.09-.75.08-.73.08-.73a2.52 2.52 0 0 1 1.84 1.24 2.57 2.57 0 0 0 3.5 1 2.58 2.58 0 0 1 .77-1.61c-2.66-.3-5.46-1.33-5.46-5.91a4.63 4.63 0 0 1 1.23-3.21 4.3 4.3 0 0 1 .12-3.16s1-.32 3.3 1.23a11.4 11.4 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23a4.3 4.3 0 0 1 .12 3.16 4.62 4.62 0 0 1 1.23 3.21c0 4.59-2.81 5.61-5.48 5.91a2.9 2.9 0 0 1 .82 2.25l-.01 3.33c0 .32.21.7.82.58A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

const Footer = ({ onPageChange }) => {
  const { t } = useContext(LangContext);
  const content = t?.home || {};
  const footerContent = content.footer || {};
  const currentYear = new Date().getFullYear();

  const techLogos = [
    { src: "/ParisCite.png", alt: "Université Paris Cité" },
    { src: "/Python.png",    alt: "Python" },
    { src: "/Pytorch.png",   alt: "PyTorch" },
    { src: "/Faiss.png",     alt: "FAISS" },
  ];

  return (
    <footer className="bg-footer text-on-strong border-t border-border mt-auto">
      <div className="max-w-[1320px] mx-auto px-6 md:px-12 lg:px-16 py-16 md:py-20">

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 md:gap-8 mb-12">

          {/* Branding */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/Logo-2.svg" alt="MediScan" className="h-8 w-auto" />
              <h3 className="font-bold text-on-strong text-lg tracking-tight">MEDISCAN</h3>
            </div>
            <p className="text-sm text-footer-muted leading-relaxed">
              {content.footer?.tagline || "Advanced medical image search technology"}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-semibold text-on-strong text-sm mb-4 uppercase tracking-widest">{footerContent.navigationTitle || "Navigation"}</h4>
            <ul className="flex flex-col gap-3 text-sm text-footer-muted">
              {[
                { label: t.nav?.home || "Home", page: "home" },
                { label: t.nav?.scan || "Scan & Search", page: "search" },
                { label: t.nav?.features || "How it Works", page: "how" },
              ].map(({ label, page }) => (
                <li key={page}>
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    className="hover:text-on-strong transition-colors duration-200"
                  >
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-on-strong text-sm mb-4 uppercase tracking-widest">{footerContent.supportTitle || "Support"}</h4>
            <ul className="flex flex-col gap-3 text-sm text-footer-muted">
              <li>
                  <button
                    type="button"
                    onClick={() => onPageChange('about')}
                    className="hover:text-on-strong transition-colors duration-200"
                  >
                  {content.footer?.aboutus || "About Us"}
                </button>
              </li>
              <li>
                  <button
                    type="button"
                    onClick={() => onPageChange('contact')}
                    className="hover:text-on-strong transition-colors duration-200"
                  >
                  {content.footer?.contact || "Contact"}
                </button>
              </li>
              <li className="text-footer-muted/50">{footerContent.documentation || "Documentation"}</li>
              <li>
                <button
                  type="button"
                  onClick={() => onPageChange('faq')}
                  className="hover:text-on-strong transition-colors duration-200"
                >
                  {footerContent.faq || "FAQ"}
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-on-strong text-sm mb-4 uppercase tracking-widest">{footerContent.legalTitle || "Legal"}</h4>
            <ul className="flex flex-col gap-3 text-sm text-footer-muted">
              <li className="hover:text-on-strong transition-colors duration-200 cursor-pointer">
                {content.footer?.privacy || "Privacy Policy"}
              </li>
              <li className="hover:text-on-strong transition-colors duration-200 cursor-pointer">
                {content.footer?.terms || "Terms of Service"}
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="font-semibold text-on-strong text-sm mb-4 uppercase tracking-widest">{footerContent.connectTitle || "Connect"}</h4>
            <a
              href="https://github.com/OzanTaskin/mediscan-cbir"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-footer-muted hover:text-on-strong transition-colors duration-200 group"
            >
              <GitHubMark className="w-4 h-4 group-hover:translate-y-[-2px] transition-transform" />
              <span>GitHub</span>
            </a>
          </div>

        </div>

        {/* Tech Stack */}
        <div className="py-8 border-t border-border/50 mb-8">
          <p className="text-xs font-semibold text-on-strong uppercase tracking-widest mb-4 opacity-80">{footerContent.builtWith || "Built with"}</p>
          <div className="flex flex-wrap items-center gap-6">
            {techLogos.map(({ src, alt }) => (
              <div key={alt} className="group" title={alt}>
                <img
                  src={src}
                  alt={alt}
                  className="h-6 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-200"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-sm text-footer-muted">
          <p>© {currentYear} MEDISCAN AI. {content.footer?.rights || "All rights reserved"}</p>
          <div>
            <span className="text-xs uppercase tracking-widest opacity-60">
              {content.footer?.compliance || "ISO Compliant"}
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
