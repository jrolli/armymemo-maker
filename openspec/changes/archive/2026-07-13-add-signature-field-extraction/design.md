# Design: add-signature-field-extraction

## Context

The app compiles armymemo source to PDF in-browser (archived `add-typst-compilation`). armymemo's `esign-field` helper emits `#metadata((name, page, x, y, w, h)) <esign-field>` at layout time — verified in the vendored `lib.typ`: numbers are plain floats in PDF points, top-left origin, y down, page 1-indexed. That value shape is byte-for-byte the manifest entry esign consumes. This change extracts those values after each successful compile and reports them in the UI; the next change feeds them to esign WASM.

The compiler wrapper already exposes what's needed: `TypstCompiler.query({mainFilePath, selector, field, inputs})` (confirmed in typst.ts 0.7.0 typings during the previous change).

## Goals / Non-Goals

**Goals:**

- After every successful compile, produce a validated field manifest `[{name, page, x, y, w, h}]` from `<esign-field>` metadata.
- Report detected fields (or their absence) in the UI; zero fields is valid but flagged as producing a non-signable PDF.
- Manifest problems (duplicate names, bad geometry) surface as visible diagnostics, never silently.

**Non-Goals:**

- Applying the manifest to the PDF (next change, `add-esign-signable-pdf`).
- Field visualization overlays on the preview; a textual report suffices until there's evidence it doesn't.
- Extracting fields from documents that fail to compile (no document, no fields).

## Decisions

### D1: Query as part of the compile pipeline, same snapshot inputs

`compileToPdf` grows a second step: after a successful PDF export, call `compiler.query({mainFilePath, selector: '<esign-field>', field: 'value', inputs: {font: COMPILE_FONT}})`. Passing identical `inputs` matters — typst.ts snapshots `sys.inputs` per call, and coordinates must come from the same layout that produced the PDF (fonts affect metrics). Memo-sized documents make the extra query pass cheap.

- *Alternative — single `compile` returning both artifact and query results:* the wrapper has no combined call; two calls against the same source/inputs is the supported path.
- *Implementation note (discovered):* `TypstCompiler.query` / `$typst.query` snapshot a world but never compile it, failing with "document is not compiled". The working path is the public `runWithWorld({mainFilePath, inputs}, world => { await world.compile(); return world.query({selector, field}); })`, which is what the service uses.

### D2: Extraction failure does not fail the compile

The outcome type becomes `{ok: true, pdf, fields: FieldManifest | {error: string}} | {ok: false, diagnostics}`. A query error or invalid manifest leaves the PDF fully usable (preview + plain download) while the field status area shows the extraction problem. Rationale: the user's document compiled; withholding it over metadata would destroy work for no safety gain. The next change treats a missing/invalid manifest as "produce plain PDF, say so".

Validation rules (each violation reported with the offending field name): `name` non-empty string, unique across the manifest; `page` integer ≥ 1; `x`, `y` finite numbers; `w`, `h` finite and > 0.

### D3: Field status reported in the output pane header

A status line in the output pane's header (`#field-status`) after each successful compile: "2 signature fields: Signature, Concur1", "No signature fields — download will be a plain (non-signable) PDF", or "Signature field problem: …" for validation errors. It clears on failed compiles (diagnostics own the pane then). This keeps the report adjacent to the artifact it describes without new layout regions.

## Risks / Trade-offs

- [Query pass could disagree with the PDF pass if inputs differ] → Single source of truth for `inputs` in the service module; both calls share the same constant.
- [typst.ts query returns richer/looser JSON than expected] → Validation layer normalizes and rejects rather than trusting shapes; verification asserts against the real armymemo output.
- [Duplicate `<esign-field>` labels are legal in Typst, so duplicate names can reach the manifest] → That's exactly what validation catches (esign requires unique names); covered by a dedicated test crafting duplicates by hand.

## Migration Plan

Additive; deploy/rollback the static bundle as ever.

## Open Questions

- Whether the field report should eventually overlay boxes on the preview — deferred until the signable download exists and real usage shows a need.
