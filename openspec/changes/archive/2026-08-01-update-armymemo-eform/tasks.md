# Tasks: update-armymemo-eform

## 1. Re-vendor upstreams

- [x] 1.1 Update `scripts/vendor-armymemo.mjs`: COMMIT → 3388e8fc2a1573eda635d3faee9be4390ede68d0, add `vendor/eform/lib.typ` and `vendor/eform/typst.toml` to FILES with subdirectory staging; rerun and commit the regenerated `vendor/armymemo-0.1.0.tar.gz`
- [x] 1.2 Rename `scripts/vendor-esign.sh` → `scripts/vendor-eform.sh`: repo URL github.com/jrolli/eform, COMMIT → a7db0d43e66e0162cf0b5ffd5ae05140133b0fc6, output dir `vendor/eform/`, wasm artifact `eform.wasm`, package `eform`, inventory `licenses/eform-crates.json`; rerun (wasm-bindgen-cli 0.2.126 still matches) and remove `vendor/esign/` + `licenses/esign-crates.json`

## 2. App source updates

- [x] 2.1 Rename `src/esign-service.ts` → `src/eform-service.ts`; import from `../vendor/eform/eform.js` and `eform_bg.wasm`; update `src/compile-worker.ts` import
- [x] 2.2 `src/typst-service.ts`: query `<eform-field>`; validator checks common keys plus known `type` values but retains entries verbatim (`FormField` type with pass-through keys); export renames (`SignatureField` → `FormField`)
- [x] 2.3 Update field-status / error copy in `src/main.ts` and `src/convert.ts` ("esign failed" → "eform failed"; signature-centric wording per design D4)
- [x] 2.4 Sweep remaining references: `vite.config.ts` comment, `index.html` / `convert.html` copy, README

## 3. Acknowledgements & metadata

- [x] 3.1 Update `scripts/generate-acknowledgements.mjs` and `scripts/check-acknowledgements.mjs` for eform names/paths; regenerate `acknowledgements.html`
- [x] 3.2 Update `openspec/config.yaml` context for the eform naming and new manifest schema

## 4. Verification

- [x] 4.1 `npm run build` passes (tsc, acknowledgements drift, local-only, precache, asset size)
- [x] 4.2 End-to-end check in a served build: starter example compiles, field status reports the Signature field, downloaded PDF contains the signature form field (with lock metadata present in the PDF)
