// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CountryProvider } from './country';
import { CountrySelection } from './components/CountrySelection';
import { getActiveCountries } from './countryApi';
import { TEST_COUNTRIES } from './testCountryData';

function renderPicker() {
  return render(<CountryProvider><CountrySelection /></CountryProvider>);
}

async function openPicker() {
  const trigger = await screen.findByRole('button', { name: /Country:/ });
  fireEvent.click(trigger);
  return trigger;
}

function setLocales(languages: string[], language = 'en-US') {
  vi.stubGlobal('navigator', { languages, language });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  vi.mocked(getActiveCountries).mockReset().mockResolvedValue(TEST_COUNTRIES);
});

describe('country selection', () => {
  it('offers active API countries in the designed dropdown and asks before applying the first enabled locale region', async () => {
    setLocales(['en-ID', 'vi-VN']);
    renderPicker();
    const picker = await openPicker();

    expect(screen.getAllByRole('option').map(option => option.textContent?.trim())).toEqual(['Vietnam✓', 'Indonesia']);
    expect(picker.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('region', { name: 'Use Indonesia as your country?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use ID' }));
    expect(screen.getByRole('button', { name: 'Country: Indonesia' })).toBeTruthy();
    expect(localStorage.getItem('compareshop.country')).toBe('ID');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('selects a country, persists it, and closes the listbox', async () => {
    renderPicker();
    await openPicker();
    fireEvent.click(screen.getByRole('option', { name: 'Indonesia' }));
    expect(screen.getByRole('button', { name: 'Country: Indonesia' }).getAttribute('aria-expanded')).toBe('false');
    expect(localStorage.getItem('compareshop.country')).toBe('ID');
  });

  it('prefers a valid saved choice over locale and ignores unsupported locale regions', async () => {
    localStorage.setItem('compareshop.country', 'VN');
    setLocales(['en-ID', 'fr-FR']);
    renderPicker();
    expect(await screen.findByRole('button', { name: 'Country: Vietnam' })).toBeTruthy();
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('dismisses only for this render session and suggests again after remount without a saved choice', async () => {
    setLocales(['en-US'], 'id-ID');
    const view = renderPicker();
    await screen.findByRole('button', { name: 'Dismiss' });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('region')).toBeNull();
    expect(localStorage.getItem('compareshop.country')).toBeNull();

    view.unmount();
    renderPicker();
    expect(await screen.findByRole('region', { name: 'Use Indonesia as your country?' })).toBeTruthy();
  });

  it('falls back to VN for invalid saved values and does not suggest unsupported regions', async () => {
    localStorage.setItem('compareshop.country', 'XX');
    setLocales(['not_a_locale', 'en-US'], 'fr-FR');
    renderPicker();
    expect(await screen.findByRole('button', { name: 'Country: Vietnam' })).toBeTruthy();
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('uses navigator.language when needed and restores an explicit selection across reloads', async () => {
    setLocales(['en-US'], 'id-ID');
    const view = renderPicker();
    expect(await screen.findByRole('region', { name: 'Use Indonesia as your country?' })).toBeTruthy();
    await openPicker();
    fireEvent.click(screen.getByRole('option', { name: 'Indonesia' }));
    expect(localStorage.getItem('compareshop.country')).toBe('ID');

    view.unmount();
    setLocales(['vi-VN'], 'vi-VN');
    renderPicker();
    expect(await screen.findByRole('button', { name: 'Country: Indonesia' })).toBeTruthy();
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('keeps the picker usable when storage reads or writes throw and announces failed persistence', async () => {
    setLocales(['vi-VN']);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('read blocked'); });
    renderPicker();
    expect(await screen.findByRole('button', { name: 'Country: Vietnam' })).toBeTruthy();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('write blocked'); });
    await openPicker();
    fireEvent.click(screen.getByRole('option', { name: 'Indonesia' }));
    expect(screen.getByRole('button', { name: 'Country: Indonesia' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('could not be saved');
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    renderPicker();
    const trigger = await openPicker();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('shows a retry state when the active Country list fails and recovers on retry', async () => {
    vi.mocked(getActiveCountries).mockRejectedValueOnce(new Error('offline'));
    renderPicker();
    expect((await screen.findByRole('alert')).textContent).toContain('couldn’t load the active countries');

    vi.mocked(getActiveCountries).mockResolvedValueOnce(TEST_COUNTRIES);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('button', { name: 'Country: Vietnam' })).toBeTruthy();
  });

  it('falls back to VN when a saved Country is no longer active', async () => {
    localStorage.setItem('compareshop.country', 'ID');
    setLocales(['id-ID']);
    vi.mocked(getActiveCountries).mockResolvedValueOnce([TEST_COUNTRIES[0]]);
    renderPicker();

    expect(await screen.findByRole('button', { name: 'Country: Vietnam' })).toBeTruthy();
    expect(screen.queryByRole('region')).toBeNull();
  });
});
