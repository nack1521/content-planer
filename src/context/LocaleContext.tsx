'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Locale } from '@/types/planner';
import enMessages from '@/messages/en.json';
import thMessages from '@/messages/th.json';

type MessagesType = typeof enMessages;

interface LocaleContextType {
  locale: Locale;
  setLocale: (newLocale: Locale) => void;
  toggleLocale: () => void;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

const messagesMap: Record<Locale, MessagesType> = {
  th: thMessages as MessagesType,
  en: enMessages as MessagesType,
};

export function LocaleProvider({
  initialLocale = 'th',
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const pathname = usePathname();

  // Keep documentElement lang in sync with active locale on client
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      if (typeof document !== 'undefined') {
        document.documentElement.lang = newLocale;
      }
      try {
        localStorage.setItem('content_planner_locale', newLocale);
        document.cookie = `content_planner_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
      } catch {
        // Fallback gracefully
      }

      // Smoothly update URL pathname to reflect new locale without hard page reload
      if (pathname) {
        const segments = pathname.split('/');
        if (segments[1] === 'th' || segments[1] === 'en') {
          segments[1] = newLocale;
          const newPath = segments.join('/') || `/${newLocale}/planner`;
          window.history.replaceState(null, '', newPath);
        }
      }
    },
    [pathname]
  );

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'th' ? 'en' : 'th');
  }, [locale, setLocale]);

  // Nested key resolver with parameter interpolation
  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>): string => {
      const currentMessages = messagesMap[locale] || messagesMap.th;
      const keys = keyPath.split('.');
      let current: unknown = currentMessages;

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = (current as Record<string, unknown>)[k];
        } else {
          // Fallback to English if key is missing in active language
          let fallback: unknown = messagesMap.en;
          for (const fbKey of keys) {
            if (fallback && typeof fallback === 'object' && fbKey in fallback) {
              fallback = (fallback as Record<string, unknown>)[fbKey];
            } else {
              fallback = undefined;
              break;
            }
          }
          current = fallback !== undefined ? fallback : keyPath;
          break;
        }
      }

      if (typeof current !== 'string') {
        return keyPath;
      }

      let result = current;
      if (params) {
        for (const [pKey, pVal] of Object.entries(params)) {
          result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        }
      }

      return result;
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
