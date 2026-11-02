// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider, useLanguage } from './i18n';

function LanguageProbe() {
  const { language, setLanguage, t } = useLanguage();
  return <>
    <output>{language}</output>
    <output>{t('home')}</output>
    <button onClick={() => setLanguage('en')}>Choose English</button>
    <button onClick={() => setLanguage('id')}>Choose Indonesian</button>
    <button onClick={() => setLanguage('invalid' as never)}>Choose unsupported language</button>
  </>;
}

function renderProvider() {
  return render(<LanguageProvider><LanguageProbe /></LanguageProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.lang = '';
});

describe('language preference', () => {
  it.each(['vi', 'en', 'id'] as const)('restores valid %s preference and updates the document language', language => {
    localStorage.setItem('giatot-language', language);
    renderProvider();

    expect(screen.getByText(language)).toBeTruthy();
    expect(document.documentElement.lang).toBe(language);
    expect(screen.getByText(language === 'vi' ? 'Trang chủ' : language === 'en' ? 'Home' : 'Beranda')).toBeTruthy();
  });

  it.each([null, 'fr', 'EN'])('defaults to Vietnamese for invalid or missing saved value %s', savedLanguage => {
    if (savedLanguage !== null) localStorage.setItem('giatot-language', savedLanguage);
    renderProvider();

    expect(screen.getByText('vi')).toBeTruthy();
    expect(document.documentElement.lang).toBe('vi');
  });

  it('ignores unsupported language selections', () => {
    renderProvider();
    fireEvent.click(screen.getByRole('button', { name: 'Choose unsupported language' }));

    expect(screen.getByText('vi')).toBeTruthy();
    expect(document.documentElement.lang).toBe('vi');
    expect(localStorage.getItem('giatot-language')).toBeNull();
  });

  it('keeps the session selection working when storage reads and writes throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('read blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('write blocked'); });
    renderProvider();

    expect(screen.getByText('vi')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choose English' }));
    expect(screen.getByText('en')).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    fireEvent.click(screen.getByRole('button', { name: 'Choose Indonesian' }));
    expect(screen.getByText('id')).toBeTruthy();
    expect(screen.getByText('Beranda')).toBeTruthy();
    expect(document.documentElement.lang).toBe('id');
  });
});
