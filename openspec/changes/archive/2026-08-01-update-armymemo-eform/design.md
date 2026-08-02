# Design: update-armymemo-eform

## Context

armymemo 3388e8f vendors the eform typst package inside its own tree
(`vendor/eform/{lib.typ,typst.toml}`) and imports it with a relative path, so
the app's tarball must now carry those two extra files or every compile fails
at `#import "vendor/eform/lib.typ"`. The metadata tag is now `<eform-field>`
and entries gained a `type` key ("signature" | "text" | "checkbox", default
signature) plus per-type options — notably `lock` on signature entries, which
armymemo uses to lock the form (except later ConcurN fields) when the author
signs.

eform a7db0d4 is the renamed esign crate (0.4.0). The wasm-bindgen surface is
byte-identical in shape — `add_fields(pdf, manifest) → bytes`, throwing a JS
`Error` — but artifacts are named `eform.js` / `eform_bg.wasm`, and the
manifest parser is strict: unknown keys are rejected (`deny_unknown_fields`
after stripping the `type` tag), unknown lock field names are rejected.
wasm-bindgen in eform's Cargo.lock is still 0.2.126, matching the installed
CLI.

## Goals / Non-Goals

**Goals:**
- Ship the new armymemo + eform pair with signature locking working
  end-to-end, preserving the local-only and offline contracts.
- Keep client-side manifest validation friendly (clear pre-eform errors for
  the common keys) without duplicating eform's full per-type schema.

**Non-Goals:**
- No app UI for authoring text/checkbox fields; they flow through untouched
  if a memo emits them.
- No support for pre-eform (`<esign-field>`) documents — armymemo is the
  only supported template and it has moved.

## Decisions

- **D1 — Tarball payload extends to subpaths.** `vendor-armymemo.mjs` gains
  `vendor/eform/lib.typ` and `vendor/eform/typst.toml` in FILES, creating
  parent directories at stage time; tar already stores paths verbatim.
  Alternative (flattening the files and patching armymemo's import) was
  rejected: the vendored tarball must stay byte-faithful to upstream files.
- **D2 — Full rename, no compat shims.** `vendor/esign` → `vendor/eform`,
  `src/esign-service.ts` → `src/eform-service.ts`,
  `scripts/vendor-esign.sh` → `scripts/vendor-eform.sh`,
  `licenses/esign-crates.json` → `licenses/eform-crates.json`. Everything is
  repo-internal; keeping esign aliases would only preserve confusion.
- **D3 — Validate common keys, pass entries through verbatim.** The client
  validator keeps checking `name/page/x/y/w/h` (and duplicate names) so the
  field-status line can explain manifest problems before eform runs, but it
  now retains each raw entry object (typed as `FormField` with an index
  signature) and sends it to eform unmodified. eform is the authority on
  per-type option validity; mirroring its schema client-side would drift.
  The `type` key, when present, is validated only as one of the three known
  strings so the status line can count field kinds accurately.
- **D4 — Field-status copy stays signature-centric.** armymemo emits only
  signature-type fields today (Signature + ConcurN); the status line keeps
  reporting "N signature field(s)" by counting entries whose effective type
  is signature, and falls back to a generic "N form field(s)" wording when
  other types appear.
- **D5 — Same vendoring pipeline, new names.** vendor-eform.sh is
  vendor-esign.sh with repo/commit/artifact/inventory names updated; the
  crate inventory is emitted from the same checkout that builds the WASM
  (design D2 of add-acknowledgements-page still holds). The acknowledgements
  drift check now reads `vendor/eform/PROVENANCE` and the eform component of
  the licenses manifest.

## Risks / Trade-offs

- [Manifest strictness: eform rejects keys the old pipeline silently
  dropped] → pass-through is now verbatim, so a future armymemo emitting a
  key eform doesn't know would fail field application; the existing
  plain-PDF fallback plus visible error already covers this, and the pinned
  tarball/commit pair is updated together.
- [Locking behavior is viewer-dependent] → lock directives are carried in
  the PDF per spec; viewers that ignore them degrade to today's behavior.
- [Tarball path payload change] → check:precache and the compile smoke test
  (initial example compile) exercise the new tarball in dev and build.

## Migration Plan

Vendor scripts rerun (maintenance-time network), commit the regenerated
artifacts + inventories + acknowledgements together; `npm run build` gates
drift. Rollback is reverting the commit — both pins move as a pair.
