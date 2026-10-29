import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

// Real router and CSS, deterministic API fixtures; never touches the dev database.
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
await server.listen();
const base = server.resolvedUrls.local[0];
let browser;
try {
  browser = await chromium.launch({ headless: true });
  await mkdir('coverage/category-browser', { recursive: true });
  for (const width of [375, 1440]) {
    for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 812 }, colorScheme });
      await page.route('https://api-compareshop-dev.giamha.online/**', route => {
        const path = new URL(route.request().url()).pathname;
        const category = { id: 1, slug: 'phones', name: 'Phones' };
        const body = path.endsWith('/categories') ? { items: [category] }
          : path.endsWith('/wishlist') ? { items: [] }
          : { items: [{ id: 1, slug: 'sample-phone', name: 'Sample phone', brand: 'Example', category, offerSummary: { minPrice: 1200000, maxPrice: 1500000, offerCount: 2 } }], page: 1, pageSize: 12, totalItems: 1, totalPages: 1 };
        return route.fulfill({ json: body });
      });
      await page.goto(`${base}category/phones`);
      await page.getByRole('link', { name: 'Xem giá', exact: true }).waitFor();
      const geometry = await page.locator('.card-actions').evaluate(element => {
        const [first, second] = [...element.children].map(child => child.getBoundingClientRect());
        return { gap: second.top - first.bottom, first: first.toJSON(), second: second.toJSON(), overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.equal(geometry.overflow, false);
      if (width === 375) assert.ok(geometry.gap >= 7, JSON.stringify(geometry));
      else assert.ok(geometry.second.left >= geometry.first.right, JSON.stringify(geometry));
      assert.equal(await page.locator('.light-shell').evaluate(element => getComputedStyle(element).colorScheme), 'light');
      const target = width === 375 ? '.filter-mobile-button' : '.category-pills a.active';
      let reached = false;
      for (let step = 0; step < 30; step++) {
        await page.keyboard.press('Tab');
        if (await page.locator(target).evaluate(element => element === document.activeElement)) { reached = true; break; }
      }
      assert.ok(reached, `Tab must reach ${target}`);
      const focus = await page.locator(target).evaluate(element => {
        const style = getComputedStyle(element);
        return { visible: element.matches(':focus-visible'), style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor };
      });
      assert.deepEqual(focus, { visible: true, style: 'solid', width: '3px', color: 'rgb(185, 56, 0)' });
      await page.screenshot({ path: `coverage/category-browser/${width}-${colorScheme}-focus.png`, fullPage: true });
      if (width === 375) {
        await page.keyboard.press('Enter');
        await page.locator('.mobile-filter-drawer').waitFor();
        await page.locator('.mobile-filter-drawer input').first().check();
        assert.equal(await page.locator('.mobile-filter-drawer input').first().isChecked(), true);
        await page.getByRole('button', { name: 'Xem kết quả', exact: true }).click();
        assert.equal(await page.locator('.mobile-filter-drawer').count(), 0);
      }
      await page.getByRole('button', { name: '+ So sánh', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('compare-products'))), ['sample-phone']);
      await page.getByRole('link', { name: 'Xem giá', exact: true }).click();
      assert.equal(new URL(page.url()).pathname, '/product/sample-phone');
      console.log(JSON.stringify({ width, colorScheme, geometry, focus }));
      await page.close();
    }
  }
} finally {
  await browser?.close();
  await server.close();
}
