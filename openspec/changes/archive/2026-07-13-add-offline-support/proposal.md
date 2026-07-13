## Why

The app is local-only by construction — every asset vendored and same-origin — yet it still needs a network to *load*. For the users this site serves (government networks, SCIFs, field conditions), the natural completion of that contract is availability without any network: visit once, keep working offline forever after.

## What Changes

- A service worker precaches the entire production bundle on first visit; afterwards the app loads, compiles, and produces signable PDFs fully offline (secure contexts only — https or localhost, matching how the site is served).
- A web app manifest and icon make the site installable as a standalone app.
- The precache manifest is generated from the actual `dist/` contents at build time, and a new build check fails if any built file is missing from it — "works offline" becomes build-enforced the same way "no external origins" already is.
- Updates are silent: a redeploy is fetched in the background on the next online visit and takes effect on the following load; no update UI.
- Dev mode is unaffected (no service worker in `npm run dev`).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `local-delivery`: gains an offline-availability requirement (service-worker precache of the full bundle, offline function after first visit, build-enforced precache completeness, silent background updates, installability). Existing requirements are unchanged.

## Impact

- New `scripts/generate-sw.mjs` (emits `dist/sw.js` with the asset list + a content-derived cache version) and `scripts/check-precache.mjs` (verifies the precache covers `dist/`), both wired into `npm run build`.
- New static `public/manifest.webmanifest` and `public/icon.svg`; `index.html` gains manifest/theme-color tags.
- `src/main.ts`: registers the service worker in production builds.
- No changes to compile pipeline, specs' local-only guarantees (the worker and all cached content are same-origin), or dev workflow.
