import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { getActiveCountries, type ActiveCountry } from './countryApi';

const DEFAULT_COUNTRY = 'VN';
const COUNTRY_STORAGE_KEY = 'compareshop.country';

type CountryState = {
  country: string;
  countries: ActiveCountry[];
  suggestion: string | null;
  persistenceError: boolean;
  selectCountry: (country: string) => void;
  dismissSuggestion: () => void;
};

const CountryContext = createContext<CountryState | null>(null);

function getLocaleRegion(locale: unknown): string | null {
  if (typeof locale !== 'string' || !locale.trim()) return null;
  try { return new Intl.Locale(locale).region?.toUpperCase() ?? null; } catch { return null; }
}

function getLocaleSuggestion(countries: ActiveCountry[]): string | null {
  const supported = new Set(countries.map(country => country.code));
  try {
    if (Array.isArray(navigator.languages)) {
      for (const locale of navigator.languages) {
        const region = getLocaleRegion(locale);
        if (region && supported.has(region)) return region;
      }
    }
  } catch { /* Restricted locale access must not block country selection. */ }
  try {
    const region = getLocaleRegion(navigator.language);
    return region && supported.has(region) ? region : null;
  } catch { return null; }
}

function readSavedCountry(): string | null {
  try { return window.localStorage.getItem(COUNTRY_STORAGE_KEY); } catch { return null; }
}

function CountryLoadState({ retry, loading }: { retry: () => void; loading: boolean }) {
  return <main className="country-load-state" role={loading ? 'status' : undefined}>
    {loading ? <p>Loading available countries…</p> : <div role="alert">
      <h1>Country selection is unavailable</h1>
      <p>We couldn’t load the active countries and catalog. Please try again.</p>
      <button className="button button-primary" type="button" onClick={retry}>Try again</button>
    </div>}
  </main>;
}

export function CountryProvider({ children, initialCountries }: { children: ReactNode; initialCountries?: ActiveCountry[] }) {
  const [countries, setCountries] = useState<ActiveCountry[]>(initialCountries ?? []);
  const [country, setCountry] = useState(() => {
    const savedCountry = readSavedCountry();
    return savedCountry && initialCountries?.some(item => item.code === savedCountry) ? savedCountry : DEFAULT_COUNTRY;
  });
  const [suggestion, setSuggestion] = useState<string | null>(() => {
    const savedCountry = readSavedCountry();
    return initialCountries && !(savedCountry && initialCountries.some(item => item.code === savedCountry))
      ? getLocaleSuggestion(initialCountries)
      : null;
  });
  const [persistenceError, setPersistenceError] = useState(false);
  const [loading, setLoading] = useState(initialCountries === undefined);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    if (initialCountries) {
      if (!initialCountries.some(item => item.code === DEFAULT_COUNTRY)) {
        setLoadError(true);
        setLoading(false);
        return;
      }
      setCountries(initialCountries);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setLoadError(false);
    getActiveCountries().then(activeCountries => {
      if (!active) return;
      if (!activeCountries.some(item => item.code === DEFAULT_COUNTRY)) throw new Error('VN is unavailable');
      setCountries(activeCountries);
      const savedCountry = readSavedCountry();
      if (savedCountry && activeCountries.some(item => item.code === savedCountry)) {
        setCountry(savedCountry);
        setSuggestion(null);
      } else {
        setCountry(DEFAULT_COUNTRY);
        setSuggestion(getLocaleSuggestion(activeCountries));
      }
    }).catch(() => {
      if (active) setLoadError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [initialCountries, loadAttempt]);

  const selectCountry = useCallback((nextCountry: string) => {
    if (!countries.some(item => item.code === nextCountry)) return;
    setCountry(nextCountry);
    setSuggestion(null);
    setPersistenceError(false);
    try { window.localStorage.setItem(COUNTRY_STORAGE_KEY, nextCountry); } catch { setPersistenceError(true); }
  }, [countries]);

  const value = useMemo<CountryState>(() => ({
    country,
    countries,
    suggestion,
    persistenceError,
    selectCountry,
    dismissSuggestion: () => setSuggestion(null),
  }), [country, countries, suggestion, persistenceError, selectCountry]);

  if (loading || loadError) return <CountryLoadState loading={loading} retry={() => setLoadAttempt(attempt => attempt + 1)} />;
  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (!context) throw new Error('useCountry must be used within CountryProvider');
  return context;
}
