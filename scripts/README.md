Home accessibility regression (SL-1124)

Run `npm ci`, `npx playwright install chromium`, then `npm run test:home-accessibility`.
An existing Chromium binary can be selected with `CHROMIUM_PATH`.

The script starts and stops its own local Vite server on port 4175, mocks catalog
responses, and tests the real Home `/` route at desktop/mobile sizes under both
browser color preferences. It verifies chip boundary contrast against both hero
gradient endpoints and chip fill, actual keyboard focus on input/button, inset
outline geometry and contrast, absence of horizontal overflow, and category
navigation. Screenshots are written to `coverage/home-accessibility/`.

CSS is not measured by V8 line coverage. Both presentation behaviors (chip
boundary and unclipped focus) are exercised in all four browser cases: manual
changed-behavior coverage 2/2 (100%). The test harness is excluded from
application diff coverage; the regression covers CSS-only changes.

Header actions layout regression (SL-1305)

Run `npm ci`, `npx playwright install chromium`, then `npm run test:header-layout`.
The script starts and stops a local Vite server and checks the real `/` route at
1440, 1024, 900, 640, 390, and 320px. It verifies the desktop collapse, action
row sizing and fit, no horizontal overflow, and the existing tablet/mobile
navigation patterns.
