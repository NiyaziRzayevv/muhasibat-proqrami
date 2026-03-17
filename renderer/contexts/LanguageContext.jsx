import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTranslation, languageNames, languageFlags } from '../i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('app_language') || 'az'; }
    catch { return 'az'; }
  });

  const t = useCallback((key) => {
    const translations = getTranslation(lang);
    return translations[key] !== undefined ? translations[key] : key;
  }, [lang]);

  const changeLang = useCallback((newLang) => {
    if (['az', 'ru', 'en'].includes(newLang)) {
      setLang(newLang);
      try { localStorage.setItem('app_language', newLang); } catch {}
    }
  }, []);

  const translations = getTranslation(lang);

  return (
    <LanguageContext.Provider value={{ lang, t, changeLang, translations, languageNames, languageFlags }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export default LanguageContext;
