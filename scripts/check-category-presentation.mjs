import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

// Exercise the real router and CSS with isolated API fixtures; never mutate dev data.
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4182', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
let browser;
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Vite startup timeout')), 15000);
    server.stdout.on('data', data => { if (data.toString().includes('http://127.0.0.1:4182')) { clearTimeout(timeout); resolve(); } });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Vite exited: ${code}`)); });
  });
  browser = await chromium.launch({ headless: true });
  for (const colorScheme of ['light', 'dark']) {
    for (const width of [320, 375, 639, 640, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 812 }, colorScheme });
      await page.route('https://fonts.googleapis.com/**', route => route.abort());
      await page.route('**/api/v1/**', route => {
        const path = new URL(route.request().url()).pathname;
        const category = { id: 1, slug: 'phones', name: 'Điện thoại' };
        const body = path.endsWith('/categories') ? { items: [category] }
          : path.endsWith('/products') ? { items: [{ id: 1, slug: 'sample-phone', name: 'Sample Phone', brand: 'Example', category, offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 2 } }], totalItems: 1, totalPages: 1, page: 1, pageSize: 12 }
          : { items: [] };
        return route.fulfill({ json: body });
      });
      await page.goto('http://127.0.0.1:4182/category/phones');
      await page.locator('.product-card').waitFor();
      const actions = page.locator('.product-card .card-actions .button');
      const first = await actions.nth(0).boundingBox();
      const second = await actions.nth(1).boundingBox();
      assert(first && second);
      const verticalGap = second.y - (first.y + first.height);
      const horizontalGap = second.x - (first.x + first.width);
      assert(width <= 639 ? verticalGap >= 7 : horizontalGap >= 7, `Actions overlap at ${width}/${colorScheme}: ${JSON.stringify({ first, second })}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow');
      assert.equal(await page.locator('.light-shell').evaluate(el => getComputedStyle(el).colorScheme), 'light');
      assert.equal(await page.locator('.language-switcher').evaluate(el => getComputedStyle(el).colorScheme), 'light');
      // Tab from the document rather than programmatic focus: :focus-visible must match.
      const focusTargets = width < 900 ? ['.filter-mobile-button', '.product-card .button-primary', '.product-card .button-ghost'] : ['.product-card .button-primary', '.product-card .button-ghost'];
      for (let step = 0; step < 60 && focusTargets.length; step++) {
        await page.keyboard.press('Tab');
        for (let index = focusTargets.length - 1; index >= 0; index--) {
          const target = page.locator(focusTargets[index]).first();
          if (await target.evaluate(el => el === document.activeElement)) {
            await target.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
            const focus = await target.evaluate(el => { const s = getComputedStyle(el); return [el.matches(':focus-visible'), s.outlineStyle, s.outlineWidth, s.outlineColor]; });
            assert.deepEqual(focus, [true, 'solid', '3px', 'rgb(185, 56, 0)']);
            if (process.env.CATEGORY_SCREENSHOTS && width === 375 && focusTargets[index] === '.filter-mobile-button') {
              await page.screenshot({ path: `${process.env.CATEGORY_SCREENSHOTS}/category-${colorScheme}.png`, fullPage: true });
            }
            focusTargets.splice(index, 1);
          }
        }
      }
      assert.equal(focusTargets.length, 0, 'Controls not reached by Tab');
      console.log(`PASS category ${width}px ${colorScheme}: gap=${width <= 639 ? verticalGap : horizontalGap}px; visible keyboard focus; fixed light; no overflow`);
      await page.close();
    }
  }
} finally {
  await browser?.close();
  server.kill();
  await new Promise(resolve => server.exitCode !== null ? resolve() : server.once('exit', resolve));
}
