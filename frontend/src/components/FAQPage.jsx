import { useState, useContext } from "react";
import { LangContext } from "../context/lang-context";
import { Plus, Minus, ArrowRight } from "lucide-react";

export default function FAQPage({ onPageChange }) {
  const { t } = useContext(LangContext);
  
  // On récupère les données FAQ. Le ?. évite de faire planter le site si t n'est pas chargé
  const content = t?.faq;
  
  const [activeTab, setActiveTab] = useState("general");
  const [openIndex, setOpenIndex] = useState(null);

  // Sécurité anti-écran blanc : si les traductions ne sont pas encore là, on affiche un loader ou vide
  if (!content || !content.items) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-muted">Loading...</div>;
  }

  // Filtrage des questions par la catégorie sélectionnée
  const filteredItems = content.items.filter(item => item.category === activeTab);

  return (
    <div className="bg-bg min-h-screen flex flex-col">
      <section className="max-w-[850px] mx-auto px-6 py-24 flex-grow">
        
        {/* Header de la page */}
        <div className="mb-16">
          <h1 className="text-4xl font-bold text-text tracking-tight mb-4">
            {content.headline}
          </h1>
          <p className="text-lg text-muted/70 font-light">
            {content.description}
          </p>
        </div>

        {/* Navigation des catégories (Tabs) */}
        <div className="flex flex-wrap gap-8 mb-12 border-b border-border/40">
          {Object.entries(content.categories).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { 
                setActiveTab(key); 
                setOpenIndex(null); 
              }}
              className={`pb-4 text-[15px] font-semibold transition-all relative ${
                activeTab === key ? "text-primary" : "text-muted hover:text-text"
              }`}
            >
              {label}
              {activeTab === key && (
                <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-primary animate-in fade-in duration-300" />
              )}
            </button>
          ))}
        </div>

        {/* Liste des Questions (Accordéon) */}
        <div className="min-h-[450px]">
          {filteredItems.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index} className="border-b border-border/60 group">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between py-8 text-left focus:outline-none transition-all"
                >
                  <span className={`text-[18px] font-medium transition-colors duration-300 ${
                    isOpen ? "text-primary" : "text-text group-hover:text-primary"
                  }`}>
                    {item.q}
                  </span>
                  <div className="ml-4 flex-shrink-0">
                    {isOpen ? (
                      <Minus className="w-5 h-5 text-primary" strokeWidth={1.5} />
                    ) : (
                      <Plus className="w-5 h-5 text-muted group-hover:text-primary transition-all" strokeWidth={1.5} />
                    )}
                  </div>
                </button>
                
                {/* Réponse animée */}
                <div 
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen ? "max-h-80 pb-8 opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <p className="text-muted leading-relaxed text-[17px] max-w-[95%]">
                    {item.r}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Contact en bas de liste */}
        <div className="mt-20 pt-10 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-muted text-sm">{content.contactTitle}</p>
          <button 
            onClick={() => onPageChange('contact')} 
            className="text-primary font-semibold hover:underline underline-offset-8 flex items-center gap-2 transition-all cursor-pointer bg-transparent border-none"
          >
            {content.contactBtn} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
}
