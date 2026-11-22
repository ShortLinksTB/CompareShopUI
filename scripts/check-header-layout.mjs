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
  await page.route('**/api/v1/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    return route.fulfill({ json: pathname.endsWith('/countries')
      ? { items: [{ id: 1, code: 'VN', name: 'Vietnam' }, { id: 2, code: 'ID', name: 'Indonesia' }] }
      : { items: [], page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
  });
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
        countryControl: rect('.country-selection'),
        countryPicker: document.querySelector('.country-switcher')?.textContent,
        countryCode: document.querySelector('.country-code')?.textContent,
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
    assert(layout.countryControl?.width > 0 && layout.countryControl.left >= 0 && layout.countryControl.right <= width,
      `Country selector fits at ${width}px: ${JSON.stringify(layout.countryControl)}`);
    assert.equal(layout.countryPicker?.trim(), 'VN', 'Country selector shows the default Country code');
    assert.equal(layout.countryCode, 'VN', 'Country code is visible in the selector');
    assert.equal(layout.searchPlaceholder, 'Tìm sản phẩm, thương hiệu, mã SKU…', 'Search uses the approved placeholder');
    if (width === 1440) {
      assert.notEqual(layout.desktopNav, 'none', 'Wide desktop keeps desktop navigation visible');
      assert.deepEqual(layout.controls, ['header-action header-sign-in', 'country-selection', 'header-actions-divider', 'header-language-control']);
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
      assert.equal(layout.bottomNav, 'grid', 'Mobile bottom navigation remains visible');
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
      `Language selection remains independent from the default Country at ${width}px`);
    await page.locator('.language-trigger').click();
    await page.getByRole('option', { name: 'VI — Tiếng Việt' }).click();
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(`${origin}/search`, { waitUntil: 'networkidle' });
  const darkMobileHeader = await page.evaluate(() => {
    const color = element => getComputedStyle(element).color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const background = element => getComputedStyle(element).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
    const contrast = (foreground, backdrop) => {
      const luminance = rgb => rgb.map(channel => channel / 255).map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2).reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const values = [luminance(foreground), luminance(backdrop)].sort((a, b) => b - a);
      return (values[0] + 0.05) / (values[1] + 0.05);
    };
    const header = document.querySelector('.site-header');
    const search = document.querySelector('.mobile-search');
    const languageIcon = document.querySelector('.language-trigger svg');
    return {
      headerBackground: background(header),
      searchColor: color(search),
      searchContrast: contrast(color(search), background(header)),
      languageIconColor: getComputedStyle(languageIcon).stroke,
      languageIconContrast: contrast(color(languageIcon), background(header)),
      searchVisible: getComputedStyle(search).display !== 'none',
    };
  });
  assert(darkMobileHeader.searchVisible, 'Dark mobile header search remains visible');
  assert.deepEqual(darkMobileHeader.searchColor, [238, 240, 243], 'Dark mobile search uses the approved light foreground');
  assert(darkMobileHeader.searchContrast >= 3, `Dark mobile search contrast is at least 3:1: ${JSON.stringify(darkMobileHeader)}`);
  assert(darkMobileHeader.languageIconContrast >= 3, `Dark mobile language icon contrast passes without a color change: ${JSON.stringify(darkMobileHeader)}`);
  console.log(`PASS dark mobile header contrast: search ${darkMobileHeader.searchContrast.toFixed(2)}:1; language icon ${darkMobileHeader.languageIconContrast.toFixed(2)}:1`);
  await page.emulateMedia({ colorScheme: 'light' });
  const lightMobileHeader = await page.evaluate(() => ({
    headerBackground: getComputedStyle(document.querySelector('.site-header')).backgroundColor,
    searchColor: getComputedStyle(document.querySelector('.mobile-search')).color,
  }));
  assert.deepEqual(lightMobileHeader, { headerBackground: 'rgb(255, 255, 255)', searchColor: 'rgb(0, 0, 0)' },
    `Light mobile header colors remain unchanged: ${JSON.stringify(lightMobileHeader)}`);
  console.log('PASS light mobile header colors remain unchanged');

  for (const colorScheme of ['light', 'dark']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ colorScheme });
    await page.goto(`${origin}/search`, { waitUntil: 'networkidle' });
    const countryButton = page.getByRole('button', { name: 'Country: Vietnam' });
    await countryButton.click();
    const headerVisual = await page.evaluate(() => {
      const bounds = selector => {
        const rect = document.querySelector(selector).getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      };
      const color = selector => getComputedStyle(document.querySelector(selector)).color;
      const background = selector => getComputedStyle(document.querySelector(selector)).backgroundColor;
      const border = selector => getComputedStyle(document.querySelector(selector)).borderColor;
      return {
        country: bounds('.country-selection'),
        divider: bounds('.header-actions-divider'),
        language: bounds('.header-language-control'),
        countryColor: color('.country-selection'),
        countryBackground: background('.country-selection'),
        countryBorder: border('.country-selection'),
        menuBackground: background('.country-menu'),
        menuColor: color('.country-menu'),
        selectedBackground: background('.country-option.selected'),
        countryPin: getComputedStyle(document.querySelector('.country-pin')).color,
      };
    });
    assert(headerVisual.country.right < headerVisual.divider.left, `${colorScheme} Country selector precedes the language divider: ${JSON.stringify(headerVisual)}`);
    assert(headerVisual.divider.right < headerVisual.language.left, `${colorScheme} language selector remains separate: ${JSON.stringify(headerVisual)}`);
    assert(headerVisual.country.width > 70 && headerVisual.country.right <= 1440, `${colorScheme} Country pill fits at desktop width: ${JSON.stringify(headerVisual)}`);
    if (colorScheme === 'light') {
      assert.equal(headerVisual.countryBackground, 'rgb(255, 255, 255)');
      assert.equal(headerVisual.menuBackground, 'rgb(255, 255, 255)');
      assert.equal(headerVisual.countryColor, 'rgb(23, 27, 36)');
    } else {
      assert.equal(headerVisual.countryBackground, 'rgb(19, 21, 26)');
      assert.equal(headerVisual.menuBackground, 'rgb(19, 21, 26)');
      assert.equal(headerVisual.countryColor, 'rgb(238, 240, 243)');
    }
    assert.notEqual(headerVisual.countryBorder, 'rgba(0, 0, 0, 0)', `${colorScheme} Country pill keeps a visible outline`);
    assert.notEqual(headerVisual.selectedBackground, headerVisual.menuBackground, `${colorScheme} selected Country is distinguished in the menu`);
    console.log(`PASS ${colorScheme} header Country pill and open menu match the approved ordering and theme`);
  }
} finally {
  await browser?.close();
  server.kill();
  await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
}
