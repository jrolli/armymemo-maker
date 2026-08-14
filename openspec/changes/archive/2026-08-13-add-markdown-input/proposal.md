## Why

Upstream armymemo supports authoring memos in Markdown via pandoc (`pandoc.typ`
+ `pandoc.sh`): YAML front matter supplies the memo metadata, a plain numbered
list becomes the memo paragraphs, and pandoc emits Typst that calls
`memo.with(...)`. Markdown is a far lower barrier to entry than Typst for most
memo authors, but pandoc is a native binary and this app is fully client-side
with a hard local-only contract — so the same input format needs an in-browser
equivalent rather than pandoc itself.

## What Changes

- Add an in-browser Markdown-to-Typst converter: parse YAML front matter and a
  CommonMark body, and emit the same Typst source the upstream `pandoc.typ`
  template would produce (`#import "@local/armymemo:<version>": memo`,
  `#show: memo.with(...)` from the front-matter fields, converted body below).
  The converted Typst then flows through the existing compile → field-extract →
  signable-PDF pipeline unchanged.
- Teach the drop-a-file conversion page to accept Markdown memos: files named
  `*.md` are converted to Typst first, then compiled; everything else keeps the
  current treat-as-Typst behavior. Conversion failures (bad or missing front
  matter) are reported in the page's existing status/diagnostics area without
  downloading anything.
- Track the converter's field mapping against upstream: a conformance fixture
  converts upstream's `examples/pandoc_example.md` and asserts the result
  compiles and produces the expected memo.
- Add the front-matter parsing dependency (`yaml`) to the acknowledgements
  manifest per the existing third-party licensing machinery.

Out of scope (possible follow-ups): a Markdown mode in the editor page, and
loading a converted `.md` into the editor as a starting draft.

## Capabilities

### New Capabilities

- `markdown-conversion`: Converting a Markdown memo (YAML front matter +
  CommonMark body) into armymemo Typst source in the browser — front-matter
  field mapping mirroring upstream `pandoc.typ`, body conversion for the
  memo-relevant Markdown subset, Typst-markup escaping of body text, and
  actionable errors for malformed input.

### Modified Capabilities

- `file-compile-page`: The conversion page's intake gains format dispatch —
  a `*.md` file is converted to Typst before compilation (with conversion
  errors surfaced like compile diagnostics); non-Markdown files keep the
  existing compile-as-Typst path, and the downloaded PDF keeps the existing
  source-name-with-`.pdf` naming for both.

## Impact

- New `src/` module for the converter (front-matter split, YAML parse, field
  mapping, body emitter with Typst escaping) plus unit tests and the upstream
  conformance fixture.
- `src/convert.ts` gains extension dispatch ahead of the existing
  `compileToPdf` call; `convert.html` copy widens from "Typst source file" to
  mention Markdown.
- New runtime npm dependency for YAML parsing (bundled into `dist/`, so it
  must appear in the acknowledgements manifest; `check:acknowledgements`
  enforces this).
- No changes to the compile pipeline, the vendored armymemo/eform payloads,
  the service worker, or the local-only checks — the converter is pure
  in-browser TypeScript, so `check:local-only` and `check:precache` are
  unaffected. The emitted `#import` version pin joins the existing set of
  version pins that must move together on armymemo bumps.
