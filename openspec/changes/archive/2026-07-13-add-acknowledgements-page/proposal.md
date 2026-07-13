## Why

The delivered bundle redistributes third-party work — the typst.ts JS runtime and its compiled Typst compiler WASM (Apache-2.0, embedding many Rust crates), the esign WASM module (AGPL-3.0-or-later, likewise embedding Rust crates), the vendored armymemo package (AGPL-3.0-or-later), and the Liberation Sans fonts (OFL-1.1) — but ships no user-visible copyright notices or license texts. Apache-2.0, OFL-1.1, MIT, and friends all condition redistribution on retaining notices; today the site does not meet that obligation.

## What Changes

- Add a static **Acknowledgements page** (`acknowledgements.html`) to the bundle listing every third-party component distributed in `dist/` — including transitive dependencies compiled into the two WASM binaries — with name, version, copyright holders, license identifier, and full license text. Linked from the page footer.
- Add **maintenance-time tooling** (network at maintenance time only, never at build/runtime, mirroring `vendor-armymemo.mjs`) to generate the notice inventory:
  - Extend `scripts/vendor-esign.sh` to emit a crate-level license inventory for esign from the pinned upstream commit.
  - New script to derive the typst-ts-web-compiler crate inventory from the upstream repo at the pinned release.
  - Capture notices for the armymemo tarball (LICENSE already inside it) and the app itself.
- **Vendor the OFL-1.1 license text** alongside the Liberation Sans fonts (currently the fonts ship with no license file, which OFL-1.1 requires).
- Assemble the page from committed notice files with a maintenance script; the committed page builds hermetically as a second Vite HTML entry, gets the production CSP, and is precached by the existing service-worker machinery.
- Add a **version-drift build check**: the build fails if the inventory's recorded versions/commits no longer match `package.json` and `vendor/esign/PROVENANCE`.
- Exempt the acknowledgements page from the `check-local-only` URL scan (license texts quote URLs); CSP and browser-level same-origin assertions remain the live enforcement.

## Capabilities

### New Capabilities

- `acknowledgements`: the acknowledgements page — its presence in the bundle, completeness of notices (including transitive WASM-embedded crates), reachability from the app, and staying in sync with the vendored dependency versions.

### Modified Capabilities

- `local-delivery`: the "No runtime network traffic beyond own origin" requirement is amended so the build-time URL scan may exempt documented, never-fetched textual references (license texts, navigation-only hyperlinks), with CSP and browser-level assertions remaining authoritative.

## Impact

- New: `acknowledgements.html`, a `licenses/` notice-inventory directory, `scripts/generate-acknowledgements.mjs` (maintenance-time assembler), `scripts/check-acknowledgements.mjs` (build-time drift check), `src/assets/fonts/LICENSE` (OFL-1.1).
- Modified: `index.html` (footer link), `vite.config.ts` (second HTML entry), `scripts/check-local-only.mjs` (scan exemption), `scripts/vendor-esign.sh` (inventory emission), `package.json` (build script wiring), `README.md`.
- No runtime code paths change; the page is plain static HTML.
