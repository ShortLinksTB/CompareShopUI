Home accessibility regression (SL-1124)

Run `npm ci`, `npx playwright install chromium`, then `npm run test:home-accessibility`.
An existing Chromium binary can be selected with `CHROMIUM_PATH`.

The script starts and stops its own local Vite server on port 4175, mocks catalog
responses, and tests the real Home `/` route at desktop/mobile sizes under both
browser color preferences. It verifies chip boundary contrast against both hero
gradient endpoints and chip fill, actual keyboard focus on input/button, inset
outline geometry and contrast, absence of horizontal overflow, and category
navigation. Screenshots are written to `coverage/home-accessibility/`.

CSS is not measured by V8 line coverage. Both changed presentation behaviors
(chip boundary and unclipped focus) are exercised in all four browser cases:
manual changed-behavior coverage 2/2 (100%). The test harness itself is excluded
from application diff coverage; no application JavaScript was changed.
