import { useEffect, useRef, useState } from 'react';
import { useCountry } from '../country';

export function CountrySelection() {
  const { country, countries, suggestion, persistenceError, selectCountry, dismissSuggestion } = useCountry();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedCountry = countries.find(option => option.code === country);
  const suggestedCountry = countries.find(option => option.code === suggestion);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = countries.findIndex(option => option.code === country);
    optionRefs.current[selectedIndex]?.focus();

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnOutsideFocus = (event: FocusEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('focusin', closeOnOutsideFocus);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('focusin', closeOnOutsideFocus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, country, countries]);

  const select = (code: string) => {
    selectCountry(code);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const focusOption = (index: number) => {
    const wrappedIndex = (index + countries.length) % countries.length;
    optionRefs.current[wrappedIndex]?.focus();
  };

  return (
    <div className="country-selection" ref={wrapperRef}>
      <button
        ref={triggerRef}
        className="country-switcher"
        type="button"
        aria-label={`Country: ${selectedCountry?.name ?? country}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="country-options"
        onClick={() => setOpen(value => !value)}
        onKeyDown={event => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <svg className="country-pin" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>
        <span className="country-code" aria-hidden="true">{country}</span>
        <svg className={`country-chevron${open ? ' is-open' : ''}`} aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && <div className="country-menu" id="country-options" role="listbox" aria-label="Choose country">
        {countries.map((option, index) => (
          <button
            key={option.code}
            ref={element => { optionRefs.current[index] = element; }}
            className={`country-option${country === option.code ? ' selected' : ''}`}
            type="button"
            role="option"
            aria-selected={country === option.code}
            tabIndex={-1}
            onClick={() => select(option.code)}
            onKeyDown={event => {
              if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(index + 1); }
              if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(index - 1); }
              if (event.key === 'Home') { event.preventDefault(); focusOption(0); }
              if (event.key === 'End') { event.preventDefault(); focusOption(countries.length - 1); }
              if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(option.code); }
            }}
          >
            <span className="country-option-code" aria-hidden="true">{option.code}</span>
            <span>{option.name}</span>
            {country === option.code && <span className="country-option-check" aria-hidden="true">✓</span>}
          </button>
        ))}
      </div>}
      {suggestedCountry && (
        <section className="country-suggestion" role="region" aria-labelledby="country-suggestion-title">
          <p id="country-suggestion-title">Use {suggestedCountry.name} as your country?</p>
          <div>
            <button type="button" onClick={() => select(suggestedCountry.code)}>Use {suggestedCountry.code}</button>
            <button type="button" onClick={dismissSuggestion}>Dismiss</button>
          </div>
        </section>
      )}
      {persistenceError && <span className="visually-hidden" role="status" aria-live="polite">Country updated for this session. It could not be saved on this device.</span>}
    </div>
  );
}
