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
  it('offers active countries from the API and asks before applying the first enabled locale region', async () => {
    setLocales(['en-ID', 'vi-VN']);
    renderPicker();
    const picker = await screen.findByRole('button', { name: 'Country: Vietnam' });
    fireEvent.click(picker);
    expect(screen.getAllByRole('option').map(option => option.getAttribute('aria-selected'))).toEqual(['true', 'false']);
    expect(screen.getByRole('option', { name: /Vietnam/ })).toBeTruthy();
    expect(screen.getByRole('option', { name: /Indonesia/ })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Use Indonesia as your country?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use ID' }));
    expect(screen.getByRole('button', { name: 'Country: Indonesia' })).toBeTruthy();
    expect(localStorage.getItem('compareshop.country')).toBe('ID');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('matches the header pill and supports arrow-key navigation and Escape', async () => {
    renderPicker();
    const trigger = await screen.findByRole('button', { name: 'Country: Vietnam' });
    expect(trigger.querySelector('.country-pin')).toBeTruthy();
    expect(trigger.textContent).toContain('VN');

    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const vietnam = screen.getByRole('option', { name: /Vietnam/ });
    expect(document.activeElement).toBe(vietnam);
    fireEvent.keyDown(vietnam, { key: 'ArrowDown' });
    const indonesia = screen.getByRole('option', { name: /Indonesia/ });
    expect(document.activeElement).toBe(indonesia);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('listbox', { name: 'Choose country' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
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

  it('uses navigator.language when languages has no enabled region and persists explicit changes across reloads', async () => {
    setLocales(['en-US'], 'id-ID');
    const view = renderPicker();
    expect(await screen.findByRole('region', { name: 'Use Indonesia as your country?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Country: Vietnam' }));
    fireEvent.click(screen.getByRole('option', { name: /Indonesia/ }));
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
    fireEvent.click(screen.getByRole('button', { name: 'Country: Vietnam' }));
    fireEvent.click(screen.getByRole('option', { name: /Indonesia/ }));
    expect(screen.getByRole('button', { name: 'Country: Indonesia' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('could not be saved');
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
