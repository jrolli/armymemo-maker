# Tasks: update-armymemo-021

## 1. Re-vendor armymemo

- [x] 1.1 Update `scripts/vendor-armymemo.mjs`: COMMIT → f649d1b4dc3c0bab68eab652ff0c78d128f5626e, VERSION → 0.2.1
- [x] 1.2 Regenerate the tarball as `vendor/armymemo-0.2.1.tar.gz` from the pinned commit (via git clone per design D1 — same FILES list, same `tar czf` invocation) and remove `vendor/armymemo-0.1.0.tar.gz`

## 2. App source updates

- [x] 2.1 `src/assets/example.typ`: `#import "@preview/armymemo:0.2.1": memo`
- [x] 2.2 `src/typst-service.ts`: import `../vendor/armymemo-0.2.1.tar.gz?url`; fetcher matches `version === "0.2.1"`

## 3. Inventories & docs

- [x] 3.1 `licenses/manifest.json`: armymemo component version → 0.2.1, description tarball name → `vendor/armymemo-0.2.1.tar.gz`
- [x] 3.2 Regenerate `acknowledgements.html` via `scripts/generate-acknowledgements.mjs`
- [x] 3.3 `README.md`: update the tarball name and `@preview/armymemo:0.1.0` reference

## 4. Verification

- [x] 4.1 `npm run build` passes (tsc, acknowledgements drift, local-only, precache, asset size)
- [x] 4.2 Sweep for stray `0.1.0` armymemo references outside `openspec/changes/archive/` (`node_modules`/`dist` excluded)
- [x] 4.3 End-to-end check in a served build (headless Chromium): starter example compiles through the vendored 0.2.1 package with no diagnostics, field status reports the Signature field, manifest carries `lock: all`
