# Tasks: add-esign-signable-pdf

## 1. Vendoring

- [x] 1.1 Write `scripts/vendor-esign.sh`: clone jrolli/esign at pinned commit `20de923…`, build `cargo build --release --target wasm32-unknown-unknown --features wasm`, run `wasm-bindgen --target web` into `vendor/esign/`, and record provenance (commit, license); run it and commit the artifacts
- [x] 1.2 Sanity-check the vendored module in Node/browser: `add_fields` exists and round-trips a trivial call

## 2. Service and pipeline

- [x] 2.1 Implement `src/esign-service.ts`: lazy `init({module_or_path: wasmUrl})`, `addFields(pdf, fields)` encoding the manifest JSON, esign errors rethrown with their message
- [x] 2.2 Wire the compile flow: valid non-empty manifest → esign produces the output PDF for preview + download; esign failure → plain PDF retained and error surfaced; field status line gains "signable PDF ready" / "download is the plain PDF" indications

## 3. Verification

- [x] 3.1 Playwright (hard-offline): compile starter example, download; assert bytes contain an AcroForm with a signature field named per the manifest, and preview src serves the same signable bytes
- [x] 3.2 Playwright: fieldless document downloads the plain PDF (no AcroForm) with the plain indication; esign-failure case (manifest page beyond page count) falls back to plain PDF with visible esign error
- [x] 3.3 Full-suite pass: build + `check:local-only` clean with the new vendored assets; no console/CSP errors; zero external requests
