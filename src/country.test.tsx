// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CountryProvider } from './country';
import { CountrySelection } from './components/CountrySelection';

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
});

describe('country selection', () => {
  it('offers only VN and ID and asks before applying the first enabled locale region', () => {
    setLocales(['en-ID', 'vi-VN']);
    renderPicker();

    const picker = screen.getByRole('combobox', { name: 'Country' }) as HTMLSelectElement;
    expect([...picker.options].map(option => option.value)).toEqual(['VN', 'ID']);
    expect(picker.value).toBe('VN');
    expect(screen.getByRole('region', { name: 'Use Indonesia as your country?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use ID' }));
    expect(picker.value).toBe('ID');
    expect(localStorage.getItem('compareshop.country')).toBe('ID');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('prefers a valid saved choice over locale and ignores unsupported locale regions', () => {
    localStorage.setItem('compareshop.country', 'VN');
    setLocales(['en-ID', 'fr-FR']);
    renderPicker();

    expect((screen.getByRole('combobox', { name: 'Country' }) as HTMLSelectElement).value).toBe('VN');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('dismisses only for this render session and suggests again after remount without a saved choice', () => {
    setLocales(['en-US'], 'id-ID');
    const view = renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('region')).toBeNull();
    expect(localStorage.getItem('compareshop.country')).toBeNull();

    view.unmount();
    renderPicker();
    expect(screen.getByRole('region', { name: 'Use Indonesia as your country?' })).toBeTruthy();
  });

  it('falls back to VN for invalid saved values and does not suggest unsupported regions', () => {
    localStorage.setItem('compareshop.country', 'XX');
    setLocales(['not_a_locale', 'en-US'], 'fr-FR');
    renderPicker();

    expect((screen.getByRole('combobox', { name: 'Country' }) as HTMLSelectElement).value).toBe('VN');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('uses navigator.language when languages has no enabled region and persists explicit changes across reloads', () => {
    setLocales(['en-US'], 'id-ID');
    const view = renderPicker();
    expect(screen.getByRole('region', { name: 'Use Indonesia as your country?' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'ID' } });
    expect(localStorage.getItem('compareshop.country')).toBe('ID');

    view.unmount();
    setLocales(['vi-VN'], 'vi-VN');
    renderPicker();
    expect((screen.getByRole('combobox', { name: 'Country' }) as HTMLSelectElement).value).toBe('ID');
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('keeps the picker usable when storage reads or writes throw and announces failed persistence', () => {
    setLocales(['vi-VN']);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('read blocked'); });
    renderPicker();
    expect((screen.getByRole('combobox', { name: 'Country' }) as HTMLSelectElement).value).toBe('VN');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('write blocked'); });
    fireEvent.change(screen.getByRole('combobox', { name: 'Country' }), { target: { value: 'ID' } });
    expect((screen.getByRole('combobox', { name: 'Country' }) as HTMLSelectElement).value).toBe('ID');
    expect(screen.getByRole('status').textContent).toContain('could not be saved');
  });
});
