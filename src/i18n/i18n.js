import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enJSON from './locales/en.json';
import esJSON from './locales/es.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { 
        translation: enJSON,
        tables: enJSON.tables // Explicitly load tables namespace
      },
      es: { 
        translation: esJSON,
        tables: esJSON.tables // Explicitly load tables namespace
      }
    },
    ns: ["translation", "tables"], // Declare namespaces
    defaultNS: "translation", // Default namespace
    fallbackLng: 'es', // Idioma por defecto
    debug: true, // Add this line for debugging
    interpolation: { escapeValue: false }
  });

export default i18n;