# Update vendored armymemo and esign→eform dependencies

## Why

Both vendored upstreams have moved: armymemo (3388e8f) now builds its
signature boxes on the new eform typst package — emitting `<eform-field>`
metadata instead of `<esign-field>`, with signature locking — and esign has
been rebranded upstream to eform (github.com/jrolli/eform, crate 0.4.0,
commit a7db0d4) with a richer manifest supporting signature, text, and
checkbox field types. The app queries the old tag and strips manifest
entries to six keys, so against the new armymemo it would find zero fields
and silently produce non-signable PDFs.

## What Changes

- Re-vendor `armymemo-0.1.0.tar.gz` at 3388e8f; the tarball payload gains
  the `vendor/eform/lib.typ` + `vendor/eform/typst.toml` files armymemo's
  `lib.typ` now imports.
- Re-vendor the WASM module from jrolli/eform at a7db0d4:
  `vendor/esign/` → `vendor/eform/` (`eform.js`, `eform_bg.wasm`, typings,
  LICENSE, PROVENANCE); `scripts/vendor-esign.sh` → `scripts/vendor-eform.sh`;
  `licenses/esign-crates.json` → `licenses/eform-crates.json`. The wasm API
  (`add_fields(pdfBytes, manifestBytes) → pdfBytes`) is unchanged.
- **BREAKING** (internal contract): field extraction queries `<eform-field>`
  instead of `<esign-field>`, and the manifest is passed to eform verbatim —
  common placement keys (`name, page, x, y, w, h`) are still validated
  client-side, but extra keys (`type`, `lock`, text/checkbox options) are
  preserved instead of stripped, since eform validates the full schema
  itself (`deny_unknown_fields`).
- Rename `src/esign-service.ts` → `src/eform-service.ts`; update user-facing
  copy and error messages ("esign failed" → "eform failed").
- Regenerate `acknowledgements.html` from the refreshed inventories; update
  `openspec/config.yaml` context and drift-check paths.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `signature-field-extraction`: query tag becomes `<eform-field>`; manifest
  entries carry an optional `type` and per-type option keys that MUST be
  preserved through to eform, not stripped.
- `signable-pdf`: the vendored module is eform (`vendor/eform/`), applied
  fields are typed (signature/text/checkbox) per manifest entry, and
  signature entries may carry a `lock` directive; fallback/error wording
  references eform.
- `file-compile-page`: naming only — the fallback policy text references
  eform instead of esign.
- `pdf-output`: naming only — the signable-download scenario references
  eform.
- `typst-compilation`: naming only — the worker loads the eform WASM
  same-origin.
- `acknowledgements`: inventory sources rename to
  `vendor/eform/PROVENANCE` and `licenses/eform-crates.json`; the page
  lists the eform WASM module.

## Impact

- `vendor/` (armymemo tarball regenerated; esign dir replaced by eform),
  `scripts/vendor-armymemo.mjs`, `scripts/vendor-esign.sh` (renamed),
  `scripts/check-acknowledgements.mjs`, `scripts/generate-acknowledgements.mjs`.
- `src/esign-service.ts` (renamed), `src/typst-service.ts`,
  `src/compile-worker.ts`, `src/main.ts`, `src/convert.ts`.
- `licenses/` inventories, `acknowledgements.html`, `openspec/config.yaml`,
  `vite.config.ts` comment, README.
- No runtime-network or backend impact: the local-only contract is
  untouched; all new bytes are vendored.
