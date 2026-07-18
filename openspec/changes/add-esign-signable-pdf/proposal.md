# Proposal: add-esign-signable-pdf

## Why

This is the payoff step: combine the compiled PDF and the extracted field manifest into a PDF containing unsigned signature form fields, so the downloaded document can be signed in standard viewers (Adobe Acrobat, Foxit). esign ships a WASM build with `add_fields(pdfBytes, manifestBytes) -> pdfBytes` designed for exactly this.

## What Changes

- Vendor the esign WASM module (`esign.js` + `esign_bg.wasm`) into the app bundle and initialize it on demand.
- After compile + extraction, when the manifest is non-empty, run `add_fields` on the compiled PDF to produce the signable PDF in memory.
- Make Download deliver the signable PDF when fields exist, falling back to the plain PDF (with a clear indication) when the memo declares no signature fields.
- Surface esign errors (malformed PDF, existing form, invalid manifest) as user-visible diagnostics; on esign failure the plain PDF remains downloadable so the user is never left with nothing.
- End-to-end result: paste armymemo source → click once → download a signable AR 25-50 memo PDF, entirely offline.

## Capabilities

### New Capabilities
- `signable-pdf`: Producing the field-bearing PDF via esign WASM — initialization, invocation with the compiled PDF and manifest, and error handling with plain-PDF fallback.

### Modified Capabilities
- `pdf-output`: Download (and preview, where the viewer renders form fields) now serves the signable PDF when signature fields are present; UI indicates which variant the user is getting.

## Impact

- New vendored runtime dependency: esign WASM build (pinned version; sourced from jrolli/esign releases or built from source at project build time).
- Compile pipeline gains a final stage; its output distinguishes plain vs. signable PDF bytes.
- Depends on `add-typst-compilation` and `add-signature-field-extraction`; completing this change achieves the project's core goal.
