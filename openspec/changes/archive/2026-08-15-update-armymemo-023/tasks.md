# Tasks: update-armymemo-023

## 1. Re-vendor armymemo

- [x] 1.1 Update `scripts/vendor-armymemo.mjs`: COMMIT → 17b437a..., VERSION → 0.2.3; tarball name references follow
- [x] 1.2 Regenerate the tarball as `vendor/armymemo-0.2.3.tar.gz` from the pinned commit (script raw-download path, or git clone per design D5) and remove `vendor/armymemo-0.2.1.tar.gz`

## 2. App source updates

- [x] 2.1 `src/assets/example.typ`: `#import "@local/armymemo:0.2.3": memo`
- [x] 2.2 `src/typst-service.ts`: import `../vendor/armymemo-0.2.3.tar.gz?url`; fetcher matches `version === "0.2.3"`
- [x] 2.3 `src/armymemo-version.ts`: `ARMYMEMO_VERSION = "0.2.3"`
- [x] 2.4 `src/markdown/memo-arguments.ts`: add `seal` to `TOP_LEVEL_FIELDS` and emit it as an optional scalar after `cf-without-encls`, matching upstream `pandoc.typ` clause order (design D1)

## 3. Fixtures

- [x] 3.1 `tests/markdown-conversion/cases/full-metadata.md`: add `seal: DOW`; regenerate its golden `.typ`
- [x] 3.2 Regenerate the remaining golden `.typ` files and `starter-example.typ` for the 0.2.3 `#import` line
- [x] 3.3 `tests/markdown-conversion/cases/pandoc-example.PROVENANCE`: pin → 17b437a (0.2.3); confirm upstream `examples/pandoc_example.md` is unchanged

## 4. Inventories & docs

- [x] 4.1 `licenses/manifest.json`: armymemo component version → 0.2.3, description tarball name → `vendor/armymemo-0.2.3.tar.gz`
- [x] 4.2 Regenerate `acknowledgements.html` via `scripts/generate-acknowledgements.mjs`
- [x] 4.3 `README.md`: tarball name and `armymemo:0.2.1` references → 0.2.3
- [x] 4.4 Remove the superseded `openspec/changes/add-markdown-seal-field/` change (design D4)

## 5. Verification

- [x] 5.1 `npm run build` passes (tsc, acknowledgements drift, markdown conversion, local-only, precache, asset size)
- [x] 5.2 Sweep for stray `0.2.1` armymemo references outside `openspec/changes/archive/` (`node_modules`/`dist`/lockfile excluded)
- [x] 5.3 Diff upstream `pandoc.typ` (17b437a) against `src/markdown/memo-arguments.ts`: seal clause mirrored, no other gaps
- [x] 5.4 End-to-end check in a served build (headless Chromium): starter example compiles through the vendored 0.2.3 package with no diagnostics; a Markdown memo with `seal: DOW` converts and compiles with the DOW letterhead
