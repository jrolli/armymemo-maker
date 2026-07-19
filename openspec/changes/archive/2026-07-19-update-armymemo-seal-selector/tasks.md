## 1. Re-vendor armymemo

- [x] 1.1 Bump `COMMIT` in `scripts/vendor-armymemo.mjs` to `7479f2b7b23b566b988047db407182cb66e35a60`
- [x] 1.2 Run `node scripts/vendor-armymemo.mjs` and verify the regenerated `vendor/armymemo-0.1.0.tar.gz` contains the pinned commit's `typst.toml`, `lib.typ` (with the `seal` selector), both seal PNGs, and `LICENSE`

## 2. Verify

- [x] 2.1 Confirm the starter example (`src/assets/example.typ`) uses neither the removed `logo` parameter nor `seal`, and that its `#import "@preview/armymemo:0.1.0"` line still matches the tarball's declared version
- [x] 2.2 Run `npm run build` and confirm it passes (typecheck, acknowledgements, local-only, precache, and asset-size checks)
- [x] 2.3 Compile the starter example against the refreshed tarball and confirm it produces a PDF with no diagnostics
