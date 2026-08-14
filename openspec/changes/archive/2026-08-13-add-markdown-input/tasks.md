## 1. Dependencies and version-pin plumbing

- [x] 1.1 Add `yaml` and `commonmark` as runtime dependencies; confirm the bundled dependency tree is pure JS and permissively licensed throughout (design D2 as amended: commonmark.js over micromark/mdast for the smaller acknowledgements surface)
- [x] 1.2 Regenerate the acknowledgements manifest for the new bundled dependencies and confirm `npm run check:acknowledgements` passes
- [x] 1.3 Create the shared `ARMYMEMO_VERSION` constant (single source for the converter's emitted `#import` pin) and extend `scripts/check-acknowledgements.mjs` to fail when the constant, `src/assets/example.typ`'s `#import`, and the vendored tarball version disagree (design D6)

## 2. Markdown-to-Typst converter

- [x] 2.1 Implement front-matter handling in `src/markdown/`: split the leading `---` block (pointed error when absent), parse with `yaml`, surface YAML errors with line/column (design D3)
- [x] 2.2 Implement the `memo.with(...)` field mapping mirroring upstream `pandoc.typ` clause-for-clause: required-field validation with one aggregated error, optional scalars, `memo-for`/`memo-thru` map lists, `enclosures` vs unquoted `enclosures-stated`, boolean flags; emit scalars as escaped Typst string literals with pandoc-style stringification (design D1)
- [x] 2.3 Implement the body emitter: commonmark AST walk covering paragraphs, ordered/unordered lists with nesting (ordered → Typst enum items), emphasis, strong, inline code, links, and hard breaks; text-run escaping mirroring pandoc's Typst writer escape set (design D2/D3)
- [x] 2.4 Implement fail-closed handling: any other AST node type throws a conversion error naming the construct and its source position
- [x] 2.5 Compose the full converter: `#import "@local/armymemo:<ARMYMEMO_VERSION>": memo` + `#show: memo.with(...)` + converted body, returning either Typst source or a structured conversion error

## 3. Conversion-page integration

- [x] 3.1 Add extension dispatch to `src/convert.ts`: `.md`/`.markdown` (case-insensitive) runs the converter before `compileToPdf`; conversion failure shows a "did not convert — nothing downloaded" status with the conversion error in the diagnostics pane; other files keep the current path (design D4)
- [x] 3.2 Verify download naming and error recovery work unchanged for Markdown inputs (`deriveConvertedFilename` swaps `.md` → `.pdf`; a following successful conversion clears the error state)
- [x] 3.3 Update `convert.html` copy (and the landing-page link text if it names the format) to say the page accepts Typst or Markdown memos

## 4. Conformance fixtures and build gate

- [x] 4.1 Vendor upstream `examples/pandoc_example.md` (pinned commit recorded in a provenance header) as a fixture, author its golden `.typ`, and compile-verify the golden in the browser once
- [x] 4.2 Add remaining fixtures: a full-metadata memo (recipient lists, enclosures, distribution, cf flags), a punctuation-torture body, and error cases (no front matter, invalid YAML, missing required fields, unsupported construct with expected location)
- [x] 4.3 Write `scripts/check-markdown-conversion.mjs` (imports the TS converter via Node type stripping) comparing fixture conversions against goldens and asserting the error cases; wire it into `npm run build` as `check:markdown-conversion` (design D5)

## 5. Verification and documentation

- [x] 5.1 Run the full `npm run build` gate chain (acknowledgements, local-only, precache, asset-size, markdown-conversion) and confirm all pass
- [x] 5.2 Manually exercise the conversion page in the browser: drop the vendored pandoc example `.md` → signable PDF downloads; drop a broken `.md` → conversion error shown, nothing downloaded; drop a `.typ` → behavior unchanged
- [x] 5.3 Update `README.md` (and self-hosting doc if it describes the conversion page) to document Markdown memo input and its pandoc-compatible format, and note the pin-sync rule now covers the converter constant in `scripts/vendor-armymemo.mjs`'s bump instructions
