# Proposal: add-signature-field-extraction

## Why

A compiled memo is not yet signable — the whole point of memo.army.dev is producing a PDF with signature form fields. The armymemo template already emits `<esign-field>` metadata (name, page, x, y, w, h in PDF points, top-left origin) exactly matching the manifest contract esign consumes. This change extracts that metadata in the browser so the following change can hand it to esign.

## What Changes

- After a successful compile, query the compiled Typst document for `<esign-field>` metadata (the in-browser equivalent of `typst query memo.typ "<esign-field>" --field value`).
- Assemble the results into an esign field manifest: a JSON array of `{name, page, x, y, w, h}` objects.
- Validate the manifest (unique field names, sane page numbers/geometry) and surface problems as user-visible diagnostics rather than silent failures.
- Show field information in the UI (e.g., "2 signature fields detected: Signature, Concur1") so users can confirm the memo declares the signers they expect; documents with zero fields are still valid but flagged as producing a non-signable PDF.

## Capabilities

### New Capabilities
- `signature-field-extraction`: Querying `<esign-field>` metadata from the compiled document, producing a validated esign-compatible field manifest, and reporting detected fields (or their absence) to the user.

### Modified Capabilities

(none — `pdf-output` starts consuming the manifest in the next change)

## Impact

- Depends on `add-typst-compilation`: the Typst WASM integration must expose document query, not just PDF export — this requirement constrains the wrapper choice made there.
- New module for manifest assembly/validation; compile pipeline output becomes `{pdfBytes, fieldManifest, diagnostics}`.
- No new vendored dependencies.
