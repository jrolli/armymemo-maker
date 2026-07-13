## 1. Service worker generation

- [x] 1.1 Create `scripts/generate-sw.mjs`: walk `dist/`, emit `dist/sw.js` with the full asset list, a content-hash-derived cache name, cache-first fetch handling, navigation fallback to `index.html`, and activate-time cleanup of old caches (design D1/D2/D3)
- [x] 1.2 Create `scripts/check-precache.mjs`: fail the build naming any `dist/` file not covered by `sw.js`'s asset list (design D4)
- [x] 1.3 Wire both into `npm run build` after `vite build` (design D4)

## 2. Manifest and registration

- [x] 2.1 Add `public/manifest.webmanifest` and `public/icon.svg`; reference the manifest and theme color from `index.html` (design D5)
- [x] 2.2 Register `/sw.js` from `src/main.ts` in production builds only, on window load, with `updateViaCache: "none"` (design D3/D6)

## 3. Verification

- [x] 3.1 Headless-browser verify offline: first visit precaches; with the context offline, reload serves the working app and compile + signable download succeed from cache only
- [x] 3.2 Verify silent update: modify the deployed bundle, regenerate `sw.js`, and confirm an online visit picks up the new version by the following load
- [x] 3.3 Verify build enforcement: an uncovered `dist/` file fails `check-precache` naming the file
- [x] 3.4 Run `npm run build` cleanly and re-run the worker/auto-compile/filename/draft verification suites
