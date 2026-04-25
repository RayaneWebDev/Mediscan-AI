/** 
 * @fileoverview Page explicative du fonctionnement du système CBIR MediScan.
 * @module components/HowItWorks
 */

import { useContext } from "react";
import { LangContext } from "../context/LangContextValue";

/**
 * Page décrivant les deux modes de recherche CBIR :
 * visuel (descripteurs d'image) et sémantique (embeddings de captions).
 *
 * @component
 * @returns {JSX.Element}
 */
export default function HowItWorks() {
  const { t } = useContext(LangContext);
  const content = t.howItWorks;

  return (
    <div className="bg-transparent">
      <section className="max-w-[1400px] mx-auto px-6 py-16">
        <h1 className="text-5xl font-bold text-title text-center mb-4">{content.headline}</h1>
        <p className="text-lg text-muted text-center mb-16 max-w-2xl mx-auto">{content.description}</p>

        {/* Deux modes */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-title mb-2 text-center">{content.modes.title}</h2>
          <p className="text-muted text-center mb-8 max-w-2xl mx-auto">{content.modes.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[content.modes.visual, content.modes.semantic].map((mode, idx) => (
              <div key={idx} className={`${idx === 0 ? "mediscan-primary-surface" : "mediscan-accent-surface"} border rounded-2xl p-8`}>
                <h3 className={`text-xl font-bold mb-1 ${idx === 0 ? "text-primary" : "text-accent"}`}>{mode.name}</h3>
                <p className="text-xs text-muted mb-4 font-mono">{mode.model}</p>
                <p className="text-muted mb-6">{mode.desc}</p>
                <div className="space-y-4">
                  {mode.steps.map((step, i) => (
                    <div key={i} className="flex gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? "bg-primary-pale text-primary" : "bg-accent-pale text-accent"}`}>
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-title text-sm">{step.title}</p>
                        <p className="text-xs text-muted">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment l'utiliser ? */}
        <div className="bg-bg-soft rounded-2xl p-8 transition-colors duration-300">
          <h2 className="text-2xl font-bold text-title mb-2 text-center">{content.when.title}</h2>
          <p className="text-muted text-center mb-8 max-w-xl mx-auto text-sm">{content.when.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-center">
              <h3 className="font-bold text-accent mb-4 text-left md:text-center">{content.when.visual.title}</h3>
              <ul className="space-y-2">
                {content.when.visual.cases.map((c, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2 items-start justify-start text-left md:justify-center md:text-center md:items-center">
                    <span className="text-accent shrink-0 mt-0.5 md:mt-0">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-accent mb-4 text-left md:text-center">{content.when.semantic.title}</h3>
              <ul className="space-y-2">
                {content.when.semantic.cases.map((c, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2 items-start justify-start text-left md:justify-center md:text-center md:items-center">
                    <span className="text-accent shrink-0 mt-0.5 md:mt-0">✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
