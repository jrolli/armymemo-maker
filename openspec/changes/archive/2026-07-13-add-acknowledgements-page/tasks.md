## 1. Notice inventory (maintenance tooling)

- [x] 1.1 Create the `licenses/` layout: a manifest (component → version/commit, SPDX id, source) plus per-component notice files
- [x] 1.2 Extend `scripts/vendor-esign.sh` to emit the esign crate-level license inventory (`cargo about`/`cargo license`) from the same pinned checkout that builds the WASM
- [x] 1.3 Write the typst-ts-web-compiler inventory step: clone Myriad-Dreamin/typst.ts at the tag matching the pinned 0.7.0 npm version and emit its crate inventory from `Cargo.lock`
- [x] 1.4 Capture remaining notices: typst.ts npm package (Apache-2.0), armymemo tarball LICENSE, the app's own AGPL-3.0-or-later notice
- [x] 1.5 Vendor the OFL-1.1 license text with the fonts as `src/assets/fonts/LICENSE` (Liberation Sans copyright notice + full OFL text)

## 2. Page assembly

- [x] 2.1 Write `scripts/generate-acknowledgements.mjs`: assemble `acknowledgements.html` from the inventory, deduplicating identical license texts with per-component attribution lines (plain HTML, site stylesheet, no scripts)
- [x] 2.2 Generate and commit `acknowledgements.html`
- [x] 2.3 Register the page as a second entry in `vite.config.ts` (`build.rollupOptions.input`) and confirm the CSP meta is injected into it
- [x] 2.4 Add the "Acknowledgements" link to the footer in `index.html` and style it in `src/style.css`

## 3. Build checks

- [x] 3.1 Exempt `acknowledgements.html` from the URL scan in `scripts/check-local-only.mjs`, with rationale comment
- [x] 3.2 Write `scripts/check-acknowledgements.mjs` (inventory versions vs `package.json`, `vendor/esign/PROVENANCE`, armymemo tarball, font files) and wire it into `npm run build`
- [x] 3.3 Verify the drift check fires: temporarily bump a recorded version and confirm the build fails naming the component

## 4. Verification and docs

- [x] 4.1 `npm run build` passes; confirm `acknowledgements.html` lands in `dist/` and appears in the service-worker precache list
- [x] 4.2 In `npm run preview`: footer link navigates to the page; page renders with JavaScript disabled; no non-self requests on load; spot-check entries (typst.ts Apache-2.0, esign AGPL, armymemo AGPL, Liberation Sans OFL, app AGPL, and a sample of transitive crates)
- [x] 4.3 Offline check: after one online visit, load the acknowledgements page with the network unreachable
- [x] 4.4 Document the maintenance flow (when bumping typst.ts or re-vendoring esign, rerun the inventory scripts) in `README.md`
