# Key-free release candidate verification

Verified on 2026-10-03. This candidate combines the story-workflows branch with the compatible Gemini-removal and production-build changes. It does not publish the app or merge `main`.

## Inputs

- Story features/theme: `1e90cdf856d4ce615d789e1f3888811d79927847`
- Gemini removal: `242cc37fb2e25f8511cbb0a232e2ead1a31ba6de`
- Deployment preparation: `c3c4d07f4afe631bb72b849b6345730ebbf44c43`

The story-workflows source is retained as the UI/data baseline. Older branch versions of App, styles and story components were not used. Compatible removal changes eliminate unused provider clients/modals, SDK dependencies and server-capability metadata. The deployment build now compiles `server.js` beside `dist`, with the production container updated to match. Unknown API paths fail with JSON 404 instead of returning the SPA.

The peach-to-coral CSS, header, approved footer links, Firebase configuration, authentication code, rules and database blueprint are preserved. New local UUIDs have a Web Crypto fallback for HTTP previews; existing IDs and browser data are not migrated.

## Passed

- Fresh Bun 1.4.2 frozen-lockfile install from the available package cache
- Type check and production client/server build
- 66 focused automated tests
- 18 production regression groups, including all 40 coordinated starters, 23 quick seeds, snapshot round trips, six-canvas ordering, character continuity and template application
- 3 compiled-production runtime tests with a clean environment and outbound requests blocked: home, built JavaScript, deep links, health, disabled Drive, removed paid endpoints, missing output and invalid port failures
- Separate fresh production-only dependency install and launch from an artifact containing no source TypeScript/backend files
- Source hash comparison for exact Firebase/auth/theme preservation; lockfile confirms the direct Gemini SDK was removed
- Independent review of compiled runtime packaging and route order

Tests use local fixtures and mocked Google responses, not real accounts or paid generation. Drive remains disabled.

## Not run / release follow-through

- Fresh browser click-through and mobile visual QA: isolated Chromium could not launch because the execution environment disallowed its local singleton socket, including the authorized retry. Automated state/markup tests are not a substitute for these browser checks. Recheck Save/Load/Copy, Board drag/arrow/Earlier/Later, bulk import/cancel/reimport, backup restore and narrow layouts in the chosen deployment preview.
- Docker image build/container startup: Docker is unavailable in this environment. The equivalent compiled artifact was exercised with fresh production dependencies.
- Real Firebase sign-in/cloud Save and real Drive OAuth/private Google Docs writes were not run. No credentials or grants were created. Existing old-origin browser/cloud records were not opened or migrated.
- A nonblocking Vite warning reports a client chunk over 500 kB. No unrelated bundle refactor is included.

The next deployment step is to build this exact branch/commit on the selected Node/container host, check `/healthz`, then verify the HTTPS app with the browser flows above. The old deployment PR still targets its original branch until separately updated; it is not this integrated candidate.
