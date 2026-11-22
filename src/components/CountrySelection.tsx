import { useEffect, useRef, useState } from 'react';
import { useCountry } from '../country';

export function CountrySelection() {
  const { country, countries, suggestion, persistenceError, selectCountry, dismissSuggestion } = useCountry();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedCountry = countries.find(option => option.code === country);
  const suggestedCountry = countries.find(option => option.code === suggestion);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="country-selection" ref={rootRef}>
      <button
        ref={triggerRef}
        className="country-trigger"
        type="button"
        aria-label={`Country: ${selectedCountry?.name ?? country}`}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        aria-controls="header-country-options"
        onClick={() => setMenuOpen(open => !open)}
      >
        <svg className="country-pin" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <b>{country}</b>
        <svg className={`country-chevron${menuOpen ? ' is-open' : ''}`} aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {menuOpen && (
        <div className="country-menu" id="header-country-options" role="listbox" aria-label="Choose country">
          {countries.map(option => (
            <button
              className={`country-option${country === option.code ? ' selected' : ''}`}
              type="button"
              role="option"
              aria-selected={country === option.code}
              key={option.code}
              onClick={() => { selectCountry(option.code); setMenuOpen(false); }}
            >
              <span>{option.name}</span>
              {country === option.code && <span className="country-check" aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>
      )}
      {suggestedCountry && (
        <section className="country-suggestion" role="region" aria-labelledby="country-suggestion-title">
          <p id="country-suggestion-title">Use {suggestedCountry.name} as your country?</p>
          <div>
            <button type="button" onClick={() => selectCountry(suggestedCountry.code)}>Use {suggestedCountry.code}</button>
            <button type="button" onClick={dismissSuggestion}>Dismiss</button>
          </div>
        </section>
      )}
      {persistenceError && <span className="visually-hidden" role="status" aria-live="polite">Country updated for this session. It could not be saved on this device.</span>}
    </div>
  );
}
