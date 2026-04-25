/** 
 * @fileoverview Page FAQ du projet MediScan CBIR avec accordéon filtrable par catégorie.
 * @module components/FAQPage
 */

import { useState, useContext } from "react";
import { LangContext } from "../context/LangContextValue";
import { ArrowRight, ChevronDown } from "lucide-react";
import Spinner from "./Spinner";

/**
 * Page FAQ
 *
 * Les questions/réponses sont chargées depuis les traductions ("t.faq").
 *
 * @component
 * @param {object} props
 * @param {function(string): void} props.onPageChange - Callback de navigation vers une autre page
 * @returns {JSX.Element}
 *
 */
export default function FAQPage({ onPageChange }) {
  const { t } = useContext(LangContext);
  const content = t.faq;

  /** @type {[string, function]} Catégorie d'onglet active */
  const [activeTab, setActiveTab] = useState("general");
  /** @type {[number|null, function]} Index de la question ouverte dans l'accordéon */
  const [openIndex, setOpenIndex] = useState(null);

  if (!content || !content.items) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Spinner label="Chargement…" />
      </div>
    );
  }
  
  /** Questions filtrées selon la catégorie sélectionnée */
  const filteredItems = content.items.filter(item => item.category === activeTab);

  return (
    <div className="home-page faq-page-surface -mt-16 md:-mt-20">
      <div className="max-w-3xl mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-20">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-title tracking-tight mb-3 leading-tight">
            {content.headline}
          </h1>
          <div className="w-10 h-0.5 bg-semantic mb-5 rounded" />
          <p className="text-base md:text-lg text-muted leading-relaxed max-w-xl">
            {content.description}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10">
          {Object.entries(content.categories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setOpenIndex(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? "bg-text text-bg"
                  : "bg-transparent border border-border text-muted hover:text-text hover:border-text/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Accordéon */}
        <div className="flex flex-col gap-2">
          {filteredItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-border bg-bg overflow-hidden transition-all duration-200 hover:border-text/20"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left focus:outline-none"
                >
                  <span className="text-base font-medium text-title pr-4">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted flex-shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                    strokeWidth={2}
                  />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-80" : "max-h-0"}`}>
                  <p className="px-6 pb-2 text-sm text-muted leading-relaxed">
                    {item.r}
                  </p>
                  {item.link && (
                    <a
                      href={item.link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center underline gap-1.5 px-6 pb-5 text-sm font-medium text-muted hover:text-text transition-colors duration-200"
                    >
                      {item.link.label}
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 rounded-2xl border border-border bg-bg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-muted">{content.contactTitle}</p>
          <button
            onClick={() => onPageChange('contact')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-text hover:gap-3 transition-all duration-200"
          >
            {content.contactBtn}
            <ArrowRight className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>

      </div>
    </div>
  );
}
