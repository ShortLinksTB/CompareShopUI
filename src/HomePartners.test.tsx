// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from './i18n';
import { HomePartners } from './HomePartners';

const api = 'https://api-compareshop-dev.giamha.online/api/v1/partners';
const partner = (index: number) => ({ name: `Partner ${index}`, slug: `partner-${index}`, websiteUrl: null });
const response = (body: unknown, ok = true) => Promise.resolve({ ok, status: ok ? 200 : 500, json: () => Promise.resolve(body) } as Response);

function renderPartners() {
  return render(<LanguageProvider><MemoryRouter><HomePartners /></MemoryRouter></LanguageProvider>);
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('HomePartners', () => {
  it('keeps the wireframe section and square placeholders until the request resolves, then renders API order and slug links', async () => {
    let resolve!: (value: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>(done => { resolve = done; }));
    vi.stubGlobal('fetch', fetchMock);
    renderPartners();

    expect(fetchMock).toHaveBeenCalledWith(api);
    expect(screen.getByRole('region', { name: 'Đối tác của chúng tôi' })).toBeTruthy();
    expect(document.querySelectorAll('.partner-placeholder')).toHaveLength(12);
    expect(document.querySelector('.partner-grid')?.getAttribute('aria-busy')).toBe('true');

    await actResolve(resolve, [partner(2), partner(1)]);
    const links = await screen.findAllByRole('link');
    expect(links.map(link => link.textContent)).toEqual(['Partner 2', 'Partner 1']);
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/shops/partner-2', '/shops/partner-1']);
    expect(document.querySelectorAll('.trust-card')).toHaveLength(4);
  });

  it('caps the displayed partners at twelve', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response(Array.from({ length: 14 }, (_, index) => partner(index + 1)))));
    renderPartners();
    await waitFor(() => expect(document.querySelectorAll('.partner-card')).toHaveLength(12));
    expect(screen.queryByRole('link', { name: 'Partner 13' })).toBeNull();
  });

  it.each([
    ['empty success', () => response([])],
    ['request failure', () => response([], false)],
    ['network failure', () => Promise.reject(new Error('offline'))],
  ])('hides only the section on %s', async (_label, result) => {
    vi.stubGlobal('fetch', vi.fn(result));
    render(<LanguageProvider><MemoryRouter><><HomePartners /><footer>Homepage footer</footer></></MemoryRouter></LanguageProvider>);
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Đối tác của chúng tôi' })).toBeNull());
    expect(screen.getByText('Homepage footer')).toBeTruthy();
  });
});

async function actResolve(resolve: (value: Response) => void, body: unknown) {
  const { act } = await import('@testing-library/react');
  await act(async () => resolve(await response(body)));
}
