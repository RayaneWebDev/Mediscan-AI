import { useContext } from "react";
import { LangContext } from "../context/LangContextValue";
import { ArrowRight } from "lucide-react";

export default function PrivacyPage({ onPageChange }) {
  const { t } = useContext(LangContext);
  const content = t.privacy;

  return (
    <div className="home-page faq-page-surface -mt-16 md:-mt-20">
      <div className="max-w-3xl mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-20">

        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-title tracking-tight mb-3 leading-tight">
            {content.headline}
          </h1>
          <div className="w-10 h-0.5 bg-semantic mb-5 rounded" />
          <p className="text-base md:text-lg text-muted leading-relaxed max-w-xl">
            {content.lastUpdate}
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {content.sections.map(function(section, i) {
            const isLast = i === content.sections.length - 1;
            return (
              <div key={i}>
                <h2 className="text-xl font-semibold text-title mb-3">{section.title}</h2>
                <p className="text-sm text-muted leading-relaxed">
                  {section.body}
                  {isLast && (
                    <a href="mailto:mediscanaisupport@gmail.com" className="ml-1 underline text-text hover:opacity-70 transition-opacity">
                      mediscanaisupport@gmail.com
                    </a>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-6 rounded-2xl border border-border bg-bg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-muted">{content.contactQuestion}</p>
          <button
            onClick={() => onPageChange("contact")}
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