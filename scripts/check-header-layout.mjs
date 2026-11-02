import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const port = 4183;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Vite startup timeout')), 15000);
    server.stdout.on('data', data => {
      if (data.toString().includes(origin)) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.once('exit', code => {
      clearTimeout(timeout);
      reject(new Error(`Vite exited before starting: ${code}`));
    });
  });

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }));
  await page.goto(origin, { waitUntil: 'networkidle' });

  for (const width of [1440, 1024, 900, 768, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.evaluate(() => {
      const rect = selector => {
        const element = document.querySelector(selector);
        const bounds = element?.getBoundingClientRect();
        return bounds ? { left: bounds.left, right: bounds.right, width: bounds.width, height: bounds.height } : null;
      };
      const controls = [...document.querySelectorAll('.header-links > *')].map(element => element.className || element.tagName);
      const language = document.querySelector('.language-trigger');
      const languageBounds = language?.getBoundingClientRect();
      return {
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        desktopNav: getComputedStyle(document.querySelector('.desktop-nav')).display,
        bottomNav: getComputedStyle(document.querySelector('.bottom-nav')).display,
        mobileSearch: getComputedStyle(document.querySelector('.mobile-search')).display,
        actions: rect('.header-links'),
        languageControl: rect('.header-language-control'),
        languageDisplay: getComputedStyle(document.querySelector('.header-language-control')).display,
        language: languageBounds ? {
          left: languageBounds.left,
          right: languageBounds.right,
          width: languageBounds.width,
          display: getComputedStyle(language).display,
          visibility: getComputedStyle(language).visibility,
          value: language.querySelector('b')?.textContent,
        } : null,
        searchPlaceholder: document.querySelector('.header-search input')?.placeholder,
        countryPicker: document.querySelector('#country-selection'),
        search: rect('.header-search-wrap'),
        controls,
        actionStyles: [...document.querySelectorAll('.header-action, .language-trigger')].map(element => {
          const style = getComputedStyle(element);
          return { height: style.height, fontSize: style.fontSize, fontWeight: style.fontWeight, borderRadius: style.borderRadius };
        }),
      };
    });

    assert(layout.documentWidth <= width, `Horizontal overflow at ${width}px: ${JSON.stringify(layout)}`);
    assert(layout.language, `Independent language selector is missing at ${width}px`);
    assert(layout.language.display !== 'none' && layout.language.visibility === 'visible' && layout.language.width >= 48,
      `Language selector is not visible at ${width}px: ${JSON.stringify(layout.language)}`);
    assert(layout.language.right <= width, `Language selector is clipped at ${width}px: ${JSON.stringify(layout)}`);
    assert.notEqual(layout.languageDisplay, 'none', `Language selector stays visible at ${width}px`);
    assert(layout.languageControl?.width > 0 && layout.languageControl.left >= 0 && layout.languageControl.right <= width,
      `Language selector fits at ${width}px: ${JSON.stringify(layout.languageControl)}`);
    assert.equal(layout.countryPicker, null, 'Header does not render country selection');
    assert.equal(layout.searchPlaceholder, 'Tìm sản phẩm, thương hiệu, mã SKU…', 'Search uses the approved placeholder');
    if (width === 1440) {
      assert.notEqual(layout.desktopNav, 'none', 'Wide desktop keeps desktop navigation visible');
      assert.deepEqual(layout.controls, ['header-action', 'header-action', 'header-actions-divider', 'header-language-control']);
    }
    if (width === 1024) {
      assert.equal(layout.desktopNav, 'none', 'Desktop navigation collapses at 1024px');
      assert(layout.search.width > 0, 'Search remains visible at the 1024px collapse');
      assert(layout.actions.right <= width, 'Header action row fits at 1024px');
      assert(layout.actionStyles.every((style, index) => style.height === '36px' && style.fontSize === '13px' && style.fontWeight === '600' && style.borderRadius === (index === layout.actionStyles.length - 1 ? '999px' : '8px')));
    }
    if (width === 900 || width === 640) {
      assert.equal(layout.desktopNav, 'none', `Tablet layout keeps desktop navigation collapsed at ${width}px`);
      assert(layout.search.width > 0, `Tablet search stays usable at ${width}px`);
      assert.equal(layout.bottomNav, 'none', 'Tablet keeps the existing non-mobile navigation pattern');
    }
    if (width <= 390) {
      assert.equal(layout.bottomNav, 'flex', 'Mobile bottom navigation remains visible');
      assert.notEqual(layout.mobileSearch, 'none', 'Mobile search action remains visible');
      assert.equal(layout.actionStyles.at(-1)?.fontSize, '13px', 'Language selector retains approved type size on mobile');
    }
    console.log(`PASS header layout ${width}px: no overflow; desktop nav ${layout.desktopNav}; bottom nav ${layout.bottomNav}`);

    await page.locator('.language-trigger').click();
    await page.getByRole('option', { name: 'EN — English' }).click();
    const languageState = await page.evaluate(() => ({
      documentLanguage: document.documentElement.lang,
      country: localStorage.getItem('compareshop.country'),
      selectedLanguage: document.querySelector('.language-trigger b')?.textContent?.toLowerCase(),
    }));
    assert.deepEqual(languageState, { documentLanguage: 'en', country: null, selectedLanguage: 'en' },
      `Language selection persists without country UI at ${width}px`);
    await page.locator('.language-trigger').click();
    await page.getByRole('option', { name: 'VI — Tiếng Việt' }).click();
  }
} finally {
  await browser?.close();
  server.kill();
  await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
}
