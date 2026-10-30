// Run with Playwright installed: node scripts/home-accessibility.cjs
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');

const luminance = color => color.match(/\d+/g).slice(0, 3).map(Number)
  .map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);

(async () => {
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.stdout.on('data', data => { if (data.toString().includes('127.0.0.1:4175')) resolve(); });
      server.on('exit', code => reject(new Error(`Vite exited ${code}`)));
    });
    browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
    await mkdir('coverage/home-accessibility', { recursive: true });
    for (const width of [1440, 390]) for (const colorScheme of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme });
      await page.route('https://api-compareshop-dev.giamha.online/**', route => route.fulfill({ json: {
        items: route.request().url().includes('/categories') ? [{ id: 1, slug: 'phone', name: 'Điện thoại' }] : [],
        totalItems: 0,
      } }));
      await page.goto('http://127.0.0.1:4175/');
      await page.locator('.popular-searches a').waitFor();
      const chip = await page.locator('.popular-searches a').evaluate(el => {
        const s = getComputedStyle(el);
        return { border: s.borderTopColor, style: s.borderTopStyle, width: s.borderTopWidth, fill: s.backgroundColor };
      });
      assert.equal(chip.style, 'solid');
      assert.equal(chip.width, '1px');
      // Hero gradient endpoints and chip fill are all adjacent to its border.
      for (const adjacent of ['rgb(17, 24, 39)', 'rgb(31, 41, 55)', chip.fill]) assert.ok(contrast(chip.border, adjacent) >= 3);
      assert.equal(await page.locator('.home-shell').evaluate(el => getComputedStyle(el).colorScheme), 'dark');
      const input = page.locator('.hero-search input');
      const placeholderColors = await input.evaluate(el => {
        const foreground = getComputedStyle(el, '::placeholder').color;
        const background = getComputedStyle(el).backgroundColor;
        return { foreground, background };
      });
      const placeholder = { ...placeholderColors, ratio: contrast(placeholderColors.foreground, placeholderColors.background) };
      assert.equal(placeholder.foreground, 'rgb(184, 184, 184)');
      assert.equal(placeholder.background, 'rgb(59, 59, 59)');
      assert.ok(placeholder.ratio >= 4.5, `Home search placeholder contrast ${placeholder.ratio}:1 is below WCAG AA`);
      console.log(`Home hero placeholder: foreground ${placeholder.foreground}, background ${placeholder.background}, contrast ${placeholder.ratio.toFixed(2)}:1`);
      for (let i = 0; i < 30 && !(await input.evaluate(el => el === document.activeElement)); i++) await page.keyboard.press('Tab');
      assert.ok(await input.evaluate(el => el === document.activeElement && el.matches(':focus-visible')));
      for (const selector of ['input', 'button']) {
        const focus = await page.locator(`.hero-search ${selector}`).evaluate(el => {
          const s = getComputedStyle(el), r = el.getBoundingClientRect(), p = el.parentElement.getBoundingClientRect();
          return { visible: el.matches(':focus-visible'), outline: s.outlineStyle, color: s.outlineColor, fill: s.backgroundColor, size: parseFloat(s.outlineWidth), offset: parseFloat(s.outlineOffset), left: r.left - p.left, right: p.right - r.right, top: r.top - p.top, bottom: p.bottom - r.bottom };
        });
        assert.ok(focus.visible);
        assert.equal(focus.outline, 'solid');
        assert.equal(focus.size, 3);
        assert.ok(contrast(focus.color, focus.fill) >= 3, 'inset focus contrasts with control fill');
        assert.ok(focus.offset <= -focus.size, 'outline must be fully inset');
        assert.ok(Math.min(focus.left, focus.right, focus.top, focus.bottom) >= 0, 'focused control stays inside form');
        await page.screenshot({ path: `coverage/home-accessibility/${width}-${colorScheme}-${selector}.png` });
        await page.keyboard.press('Tab');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('.popular-searches a').click();
      assert.ok(page.url().endsWith('/category/phone'));
      await page.close();
      console.log(`PASS Home ${width}px / ${colorScheme}: chip contrast, keyboard input/button focus, responsive layout, category link`);
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
