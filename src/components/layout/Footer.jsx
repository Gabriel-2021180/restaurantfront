import React from 'react';
import { useTranslation } from 'react-i18next';
import { Linkedin, Mail, MapPin, MessageCircle, Globe } from 'lucide-react';

const Footer = () => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <footer className="w-full bg-white dark:bg-dark-card border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Contenedor Grid: Se adapta a móvil (1 col) y desktop (3 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          
          {/* COLUMNA 1: TUS DATOS */}
          <div className="space-y-2">
            <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight">
              Gabriel Luis Azurduy
            </h3>
            <p className="text-sm text-primary font-bold">
              Backend & Fullstack Developer
            </p>
            <div className="flex items-center justify-center md:justify-start gap-2 text-gray-500 text-xs font-medium">
              <MapPin size={14} />
              <span>La Paz, Bolivia</span>
            </div>
          </div>

          {/* COLUMNA 2: TUS REDES (WhatsApp directo) */}
          <div className="flex flex-col items-center space-y-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {t('footer.contact', 'Contacto')}
            </span>
            <div className="flex gap-4">
              {/* WhatsApp */}
              <a 
                href="https://wa.me/59174078395" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-500 hover:text-white transition-all transform hover:-translate-y-1"
                title="WhatsApp"
              >
                <MessageCircle size={20} />
              </a>
              
              {/* LinkedIn */}
              <a 
                href="https://www.linkedin.com/in/g-azurduy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-600 hover:text-white transition-all transform hover:-translate-y-1"
                title="LinkedIn"
              >
                <Linkedin size={20} />
              </a>

              {/* Email */}
              <a 
                href="mailto:azurduy10082004@gmail.com" 
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-all transform hover:-translate-y-1"
                title="Email"
              >
                <Mail size={20} />
              </a>
            </div>
          </div>

          {/* COLUMNA 3: IDIOMA */}
          <div className="flex flex-col items-center md:items-end space-y-3">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <Globe size={14} className="text-gray-400 ml-2 mr-2" />
                <button
                    onClick={() => changeLanguage('es')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    i18n.language === 'es' 
                        ? 'bg-white text-primary shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    ES
                </button>
                <button
                    onClick={() => changeLanguage('en')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    i18n.language === 'en' 
                        ? 'bg-white text-primary shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    EN
                </button>
            </div>
            <p className="text-[10px] text-gray-400">
              © {new Date().getFullYear()} Gabriel Azurduy.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;