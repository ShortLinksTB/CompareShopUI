import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const stylesheet = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage();
  const viewports = [
    { width: 820, expectedFit: 'contain' },
    { width: 1440, expectedFit: 'cover' },
    { width: 390, expectedFit: 'cover' },
  ];

  for (const colorScheme of ['light', 'dark']) {
    for (const { width, expectedFit } of viewports) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1180 });
      await page.emulateMedia({ colorScheme });
      await page.setContent(`
        <html data-theme="${colorScheme}">
          <head><style>${stylesheet}</style></head>
          <body>
            <main class="container">
              <section class="product-detail">
                <div class="detail-gallery">
                  <img class="product-image-placeholder detail-image-placeholder"
                    alt="Square product fixture"
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='358' height='358'%3E%3Crect width='358' height='358' fill='%23ccc'/%3E%3C/svg%3E">
                </div>
                <div class="detail-copy">Product details</div>
              </section>
            </main>
          </body>
        </html>
      `);

      const image = await page.locator('.detail-gallery > img.detail-image-placeholder').evaluate(element => {
        const rect = element.getBoundingClientRect();
        return {
          fit: getComputedStyle(element).objectFit,
          naturalWidth: element.naturalWidth,
          naturalHeight: element.naturalHeight,
          width: rect.width,
          height: rect.height,
          documentWidth: document.documentElement.scrollWidth,
        };
      });

      assert.equal(image.naturalWidth, 358, 'the gallery image fixture should load');
      assert.equal(image.naturalHeight, 358, 'the gallery image fixture should remain square');
      assert.equal(image.fit, expectedFit, `${colorScheme} ${width}px object-fit`);
      assert.ok(image.width > 0 && image.height > 0, 'the main gallery image should be visible');
      assert.ok(image.documentWidth <= width, `${colorScheme} ${width}px should not overflow horizontally`);
      console.log(`${colorScheme} ${width}px: ${image.fit}, ${image.width}x${image.height}, no horizontal overflow`);
    }
  }
} finally {
  await browser.close();
}
