# Tasks: add-signature-field-extraction

## 1. Service pipeline

- [x] 1.1 Extend `src/typst-service.ts`: after successful PDF export, query `<esign-field>` (field `value`) with the same shared `inputs`; add `FieldManifest` types and return `fields` alongside `pdf` per design D2
- [x] 1.2 Implement manifest validation (non-empty unique names, integer page ≥ 1, finite coords, positive w/h) returning either the manifest or a descriptive error naming the offending field

## 2. UI

- [x] 2.1 Add the `#field-status` line to the output pane header and populate it from compile outcomes: field count + names, zero-field non-signable note, or extraction/validation problem; cleared while diagnostics are shown

## 3. Verification

- [x] 3.1 Playwright: compile the starter example; assert the field status names the memo's signature field(s) and that the in-page manifest has plausible geometry; all requests same-origin
- [x] 3.2 Playwright: compile a fieldless document; assert the zero-field non-signable message, and that it replaces a previous compile's field list (report tracks latest compile)
- [x] 3.3 Playwright: compile a document hand-emitting duplicate `<esign-field>` names; assert the visible duplicate-name report, no retained manifest, and that preview/download of the PDF still work
