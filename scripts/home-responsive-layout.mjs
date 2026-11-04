import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const baseUrl = 'http://127.0.0.1:4173';
const screenshotDir = process.env.SCREENSHOT_DIR ?? './artifacts/sl-1501';
const viewports = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'reported-2k', width: 2498, height: 1283 },
  { name: '2k', width: 2560, height: 1440 },
];

const categories = [
  { id: 1, slug: 'audio', name: 'Audio' },
  { id: 2, slug: 'computers', name: 'Computers' },
  { id: 3, slug: 'phones', name: 'Phones' },
];
const products = [
  { id: 1, slug: 'demo-audio-a1', name: 'Demo Audio A1', brand: 'Demo', category: { id: 1, slug: 'audio', name: 'Audio' }, offerSummary: { minPrice: 0, maxPrice: 0, offerCount: 0 } },
  { id: 2, slug: 'demo-audio-a2', name: 'Demo Audio A2', brand: 'Demo', category: { id: 1, slug: 'audio', name: 'Audio' }, offerSummary: { minPrice: 0, maxPrice: 0, offerCount: 0 } },
  { id: 3, slug: 'demo-computer-c1', name: 'Demo Computer C1', brand: 'Demo', category: { id: 2, slug: 'computers', name: 'Computers' }, offerSummary: { minPrice: 0, maxPrice: 0, offerCount: 0 } },
];

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Vite exited with code ${server.exitCode}`);
    try {
      const response = await fetch(baseUrl);
      if (response.ok) { ready = true; break; }
    } catch {}
    await delay(250);
  }
  assert(ready, 'Vite did not become ready');

  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH ?? '/snap/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  await mkdir(screenshotDir, { recursive: true });

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.route('**/api/v1/**', route => {
      const body = new URL(route.request().url()).pathname.endsWith('/categories')
        ? { items: categories }
        : { items: products, page: 1, pageSize: 10, totalItems: products.length, totalPages: 1 };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await page.locator('.hero-featured-product').first().waitFor();
    const layout = await page.evaluate(() => {
      const rect = (selector) => {
        const { x, y, width, height, right, bottom } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height, right, bottom };
      };
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        hero: rect('.hero'),
        copy: rect('.hero-copy'),
        featured: rect('.hero-featured-card'),
        footer: rect('.site-footer'),
      };
    });

    assert(Math.abs(layout.hero.x) < 1, `${viewport.name}: hero left edge is ${layout.hero.x}`);
    assert(Math.abs(layout.hero.width - viewport.width) < 2, `${viewport.name}: hero width is ${layout.hero.width}`);
    assert(Math.abs(layout.footer.x) < 1, `${viewport.name}: footer left edge is ${layout.footer.x}`);
    assert(Math.abs(layout.footer.width - viewport.width) < 2, `${viewport.name}: footer width is ${layout.footer.width}`);
    assert(layout.copy.width >= 280, `${viewport.name}: hero copy is only ${layout.copy.width}px wide`);
    assert(layout.featured.x >= layout.hero.x && layout.featured.right <= layout.hero.right + 1, `${viewport.name}: featured card escaped the hero bounds`);
    const overlaps = layout.copy.x < layout.featured.right && layout.copy.right > layout.featured.x
      && layout.copy.y < layout.featured.bottom && layout.copy.bottom > layout.featured.y;
    assert.equal(overlaps, false, `${viewport.name}: featured card overlaps hero copy`);
    assert(layout.documentWidth <= viewport.width + 2, `${viewport.name}: page overflows horizontally to ${layout.documentWidth}px`);

    await page.screenshot({ path: `${screenshotDir}/home-${viewport.name}.png`, fullPage: true });
    console.log(`${viewport.name} ${viewport.width}x${viewport.height}: hero=${Math.round(layout.hero.width)}px, footer=${Math.round(layout.footer.width)}px, copy=${Math.round(layout.copy.width)}px`);
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
