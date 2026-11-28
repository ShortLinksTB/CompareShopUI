# CompareShopUI
CompareShopUI

### Category presentation regression

Run `npx playwright install chromium` once, then `npm run test:category-presentation`. The foreground check starts and stops its own local Vite server, mocks catalog/wishlist APIs, and checks `/category/phones` with real Chromium layout and keyboard Tab navigation at 320, 375, 639, 640, and 1280 px under light and dark browser preferences. Set `CATEGORY_SCREENSHOTS` to an existing directory to save mobile focus screenshots.

## Quy trình PR
- Mọi thay đổi đi qua Pull Request vào nhánh `dev`; không push thẳng vào `dev` hoặc `main`.
- Check CI `build-test` phải pass trước khi merge.
