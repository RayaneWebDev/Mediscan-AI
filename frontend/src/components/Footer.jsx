import React, { useContext } from 'react';
import { LangContext } from "../context/lang-context";

const Footer = ({ onPageChange }) => {
  const { t } = useContext(LangContext);
  const content = t.home; 
  const currentYear = new Date().getFullYear();

const Icons = {
  pariscite : "../ParisCite.png",
  python : "../Python.png",
  pytorch : "../Pytorch.png",
  faiss : "Faiss.png"
};

  return (
    <footer className="bg-footer text-white py-5 pt-15 border-t border-border mt-auto">
      <div className="mx-auto px-8 md:px-20">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12 text-left">
          
            {/* 1. Branding */}
            <div>
                <h4 className="font-bold mb-4 text-lg">MEDISCAN AI</h4>
                <p className="text-sm text-footer-muted leading-relaxed">
                    {content.footer.tagline}
                </p>
            </div>

            {/* 2. Navigation */}
            <div>
            <h4 className="font-bold mb-4 text-lg">Navigation</h4>
            <ul className="flex flex-col gap-3 text-sm text-footer-muted">
                <li className="w-fit hover:text-white hover:underline cursor-pointer transition-colors duration-200">
                {t.nav.home}
                </li>
                <li className="w-fit hover:text-white hover:underline cursor-pointer transition-colors duration-200">
                {t.nav.scan}
                </li>
                <li className="w-fit hover:text-white hover:underline cursor-pointer transition-colors duration-200">
                {t.nav.features}
                </li>
            </ul>
            </div>

            {/* 3. Support */}
            <div>
                <h4 className="font-bold mb-4 text-lg">Support</h4>
                <ul className="flex flex-col gap-3 text-sm text-footer-muted">
                    {/* OnPageChange pour About Us et Contact si tu as les pages */}
                    <li 
                        onClick={() => onPageChange('home')} 
                        className="w-fit hover:text-white hover:underline cursor-pointer transition-colors duration-200"
                    >
                        {content.footer.aboutus}
                    </li>
                    <li 
                        onClick={() => onPageChange('contact')}
                        className="w-fit hover:text-white hover:underline cursor-pointer transition-colors duration-200"
                    >
                        {content.footer.contact}
                    </li>
                    
                    <li className="w-fit hover:text-white hover:underline cursor-pointer transition-colors duration-200">
                        Documentation
                    </li>

                    {/* LIEN FAQ : Le clic est sur toute la ligne (li) */}
                    <li 
                        onClick={() => onPageChange('faq')}
                        className="group w-fit flex items-center gap-1.5 cursor-pointer text-footer-muted hover:text-white transition-all duration-200 border-b-2 border-transparent pb-0.5 hover:border-white"
                    >
                        <span className="font-medium text-sm">FAQ</span>
                        <img 
                            src="/Chain.png" 
                            alt="Chain logo" 
                            className="w-3 h-3 pt-0.5 object-contain brightness-0 invert opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-300 ease-out" 
                        />
                    </li>          
                </ul>
            </div>

            {/* 4. Legal */}
            <div>
                <h4 className="font-bold mb-4 text-lg">Legal</h4>
                <ul className="flex flex-col gap-3 text-sm text-footer-muted">
                    <li className="w-fit hover:text-white hover:underline cursor-pointer transition-colors duration-200">{content.footer.privacy}</li>
                    <li className="w-fit hover:text-white hover:underline cursor-pointer transition-colors duration-200">{content.footer.terms}</li>
                </ul>
            </div>

        </div>

        {/* Icons */}
        <div className="flex items-center gap-5 mb-4 opacity-90"> 
            {Object.values(Icons).map((src, index) => (
                <img 
                key={index}
                src={src} 
                alt="tech" 
                className="h-7 w-auto object-contain brightness-110" 
                />
            ))}
        </div>

        {/* Bas du footer */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-start md:items-center text-sm text-footer-muted gap-6">
        
        <p>© {currentYear} MEDISCAN AI. {content.footer.rights}</p>
            
        <div className="flex items-center gap-6">
            <span className="text-[10px] uppercase tracking-widest opacity-70">
            {content.footer.compliance}
            </span>
            
            <a 
            href="https://github.com/OzanTaskin/mediscan-cbir" 
            target="_blank" 
            className="hover:opacity-100 transition-opacity"
            >
            <img 
                src="/Github.png" 
                alt="GitHub" 
                className="w-5 h-5 brightness-0 invert" 
            />
            </a>
        </div>
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;