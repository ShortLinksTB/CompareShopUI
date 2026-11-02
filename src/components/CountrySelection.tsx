import { ENABLED_COUNTRIES, useCountry } from '../country';

export function CountrySelection() {
  const { country, suggestion, persistenceError, selectCountry, dismissSuggestion } = useCountry();
  const suggestedCountry = ENABLED_COUNTRIES.find(option => option.code === suggestion);

  return (
    <div className="country-selection">
      <label className="visually-hidden" htmlFor="country-selection">Country</label>
      <select
        id="country-selection"
        className="country-switcher"
        value={country}
        onChange={event => selectCountry(event.target.value as typeof country)}
        aria-label="Country"
      >
        {ENABLED_COUNTRIES.map(option => (
          <option key={option.code} value={option.code}>{option.code} — {option.name}</option>
        ))}
      </select>
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
