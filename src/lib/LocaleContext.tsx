import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { translations } from './i18n';
import type { Locale, T } from './i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: T;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('locale');
    return stored === 'en' ? 'en' : 'ko';
  });

  function setLocale(l: Locale) {
    setLocaleState(l);
    localStorage.setItem('locale', l);
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be inside LocaleProvider');
  return ctx;
}
