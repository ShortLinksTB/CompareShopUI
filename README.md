# CompareShopUI

Category browser regression: run `npm ci`, `npx playwright install chromium`,
then `npm run test:category-browser`. The script starts and closes its own local
Vite server and browser, mocks catalog/wishlist responses, and checks the actual
`/category/phones` route at 375×812 and 1440×812 with light/dark browser preferences.
It verifies action geometry, keyboard focus, fixed-light controls, filtering,
comparison and product navigation. Screenshots are saved under
`coverage/category-browser/` (run after Vitest coverage, which clears that folder).
CompareShopUI
