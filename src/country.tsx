import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export const ENABLED_COUNTRIES = [
  { code: 'VN', name: 'Vietnam' },
  { code: 'ID', name: 'Indonesia' },
] as const;

export type CountryCode = (typeof ENABLED_COUNTRIES)[number]['code'];

const DEFAULT_COUNTRY: CountryCode = 'VN';
const COUNTRY_STORAGE_KEY = 'compareshop.country';

type CountryState = {
  country: CountryCode;
  suggestion: CountryCode | null;
  persistenceError: boolean;
  selectCountry: (country: CountryCode) => void;
  dismissSuggestion: () => void;
};

const CountryContext = createContext<CountryState | null>(null);

function isEnabledCountry(value: unknown): value is CountryCode {
  return typeof value === 'string' && ENABLED_COUNTRIES.some(country => country.code === value);
}

function getLocaleRegion(locale: unknown): CountryCode | null {
  if (typeof locale !== 'string' || !locale.trim()) return null;
  try {
    const region = new Intl.Locale(locale).region?.toUpperCase();
    return isEnabledCountry(region) ? region : null;
  } catch {
    return null;
  }
}

function getLocaleSuggestion(): CountryCode | null {
  try {
    const locales = navigator.languages;
    if (Array.isArray(locales)) {
      for (const locale of locales) {
        const region = getLocaleRegion(locale);
        if (region) return region;
      }
    }
  } catch {
    // A restricted or unavailable locale list must not block the page.
  }

  try {
    return getLocaleRegion(navigator.language);
  } catch {
    return null;
  }
}

function readSavedCountry(): CountryCode | null {
  try {
    const stored = window.localStorage.getItem(COUNTRY_STORAGE_KEY);
    return isEnabledCountry(stored) ? stored : null;
  } catch {
    return null;
  }
}

function initializeCountry() {
  const savedCountry = readSavedCountry();
  if (savedCountry) return { country: savedCountry, suggestion: null };
  return { country: DEFAULT_COUNTRY, suggestion: getLocaleSuggestion() };
}

export function CountryProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(initializeCountry);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [suggestion, setSuggestion] = useState<CountryCode | null>(initial.suggestion);
  const [persistenceError, setPersistenceError] = useState(false);

  const value = useMemo<CountryState>(() => ({
    country,
    suggestion,
    persistenceError,
    selectCountry: nextCountry => {
      if (!isEnabledCountry(nextCountry)) return;
      setCountry(nextCountry);
      setSuggestion(null);
      setPersistenceError(false);
      try {
        window.localStorage.setItem(COUNTRY_STORAGE_KEY, nextCountry);
      } catch {
        setPersistenceError(true);
      }
    },
    dismissSuggestion: () => setSuggestion(null),
  }), [country, suggestion, persistenceError]);

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (!context) throw new Error('useCountry must be used within CountryProvider');
  return context;
}
