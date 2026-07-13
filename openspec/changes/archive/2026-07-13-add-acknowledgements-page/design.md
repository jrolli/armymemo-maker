## Context

The bundle redistributes third-party work in four forms, none of which currently surfaces notices to users:

- **npm-shipped JS**: `@myriaddreamin/typst.ts` 0.7.0 (Apache-2.0) — bundled into `dist/` by Vite.
- **WASM binaries**: the typst-ts-web-compiler WASM (Apache-2.0; embeds the Typst compiler and its Rust crate graph) and `vendor/esign/esign_bg.wasm` (AGPL-3.0-or-later; embeds its own crate graph, pinned commit recorded in `vendor/esign/PROVENANCE`). Compiled-in crates are still redistribution — their MIT/Apache/BSD notices apply.
- **Vendored content**: `vendor/armymemo-0.1.0.tar.gz` (AGPL-3.0-or-later, LICENSE inside the tarball) and the Liberation Sans fonts in `src/assets/fonts/` (OFL-1.1 — currently vendored **without** their license text, which OFL-1.1 §1 requires).
- **The app itself**: AGPL-3.0-or-later (`LICENSE`).

Relevant machinery: single-entry Vite build with `injectProductionCsp` (its `transformIndexHtml` hook applies to every HTML entry in a multi-page build); `generate-sw.mjs` precaches all of `dist/`; `check-local-only.mjs` fails the build on non-allowlisted `http(s)://` strings in `dist/`; `vendor-*.{sh,mjs}` scripts use the network at maintenance time only.

## Goals / Non-Goals

**Goals:**
- License-compliant redistribution: copyright notices and full license texts for everything in `dist/`, transitive WASM-embedded crates included.
- Inventory that provably tracks the pinned versions, with drift caught at build time.
- Hermetic app build; network only in maintenance scripts, matching the vendoring pattern.

**Non-Goals:**
- Notices for build-time-only tools (Vite, TypeScript, esbuild, Playwright) — they are not redistributed.
- A general "about" page, SBOM formats (SPDX/CycloneDX documents), or automated license-compatibility analysis.
- The GitHub repo footer link (separate change: `add-footer-repo-link`; this change only adds the Acknowledgements footer link).

## Decisions

**D1 — Committed inventory + maintenance-time assembly; the build only copies.**
A `licenses/` directory holds committed per-component notice files plus a small manifest recording each component's name, version/commit, and license id. `scripts/generate-acknowledgements.mjs` (run by a maintainer, like `vendor-armymemo.mjs`) regenerates `acknowledgements.html` from that inventory and is the only thing allowed to touch the network. The committed page is reviewable in diffs and the app build stays hermetic. Alternative — generate the page during `npm run build`: rejected; it would either need network access or still need the committed inventory, gaining nothing.

**D2 — Crate inventories come from the pinned upstream sources via `cargo about` (fallback `cargo license`).**
- esign: extend `scripts/vendor-esign.sh` — it already checks out the pinned commit to build the WASM; add a step emitting `licenses/esign-crates.*` from that same checkout, so WASM and inventory can never come from different commits.
- typst-ts-web-compiler: new maintenance step in `generate-acknowledgements.mjs` that clones Myriad-Dreamin/typst.ts at the tag matching the pinned npm version (0.7.0) and runs the same tooling against the web-compiler crate, honoring its `Cargo.lock`.
Alternative — hand-maintained crate list: rejected, silently rots on every upgrade. Alternative — extracting notices from the `.wasm` binaries: not feasible; license metadata does not survive compilation.

**D3 — Dedup by license text, attribute per component.**
Hundreds of crates share verbatim MIT/Apache-2.0 texts. The page groups components under each unique license text with one copyright/attribution line per component. Full texts appear once each — compliant and readable, and it keeps the page well under the 25 MiB asset cap (expected: tens of KB).

**D4 — `acknowledgements.html` as a second Vite entry.**
Add `build.rollupOptions.input = { main: index.html, acknowledgements: acknowledgements.html }`. `injectProductionCsp` covers it automatically via `transformIndexHtml`; `generate-sw.mjs` precaches whole-`dist/` so offline availability and `check-precache` need no changes. The page is plain HTML with the site stylesheet and no scripts. Alternative — in-app modal/route rendered by JS: rejected; more code, breaks without JS, and notices should not depend on app code executing.

**D5 — Exempt the acknowledgements page from the `check-local-only` URL scan.**
License texts quote URLs (apache.org, fsf.org, gnu.org, scripts.sil.org, crate homepages…). Allowlisting prefixes one by one would grow unboundedly with every dependency bump and drown the signal. Instead `check-local-only.mjs` skips `acknowledgements.html` (and only it) with a written rationale: it is a page of legal notices whose URLs are text, the CSP still governs it, and the Playwright same-origin network assertions remain the live enforcement. This nuance is reflected in the `local-delivery` spec delta. Alternative — per-URL allowlist: rejected as above.

**D6 — Drift check wired into `npm run build`.**
`scripts/check-acknowledgements.mjs` compares the inventory manifest against ground truth: typst.ts version in `package.json`, esign commit in `vendor/esign/PROVENANCE`, armymemo tarball version, and the font files present. Any mismatch fails the build naming the stale component — the same enforcement pattern as the other `check:*` scripts.

## Risks / Trade-offs

- [`cargo about` may be unavailable or upstream may not build on a maintainer machine] → The inventory step is maintenance-time; failures block a dependency bump, never a user build. Script documents its prerequisites like `vendor-esign.sh` documents wasm-bindgen.
- [A crate ships no license file] → Fall back to the SPDX canonical text for its declared license id, keeping the crate's own copyright line; flag crates with no declared license for manual resolution rather than guessing.
- [Scan exemption could hide a real external fetch added to the acknowledgements page later] → The exemption is one file, the page has no scripts, and the CSP + browser assertions still block/catch any actual load.
- [Copyright lines for some crates are absent (many Rust crates carry none)] → List author/repository attribution from crate metadata instead; absence of a copyright line does not remove the license-text obligation, which D3 satisfies.

## Open Questions

- Whether to also link the acknowledgements page from the compile-engine loading note (nice-to-have; footer link satisfies the requirement).
