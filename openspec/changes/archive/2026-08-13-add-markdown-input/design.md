## Context

Upstream armymemo ships pandoc support: `pandoc.typ` is a pandoc template that
maps YAML front matter onto `memo.with(...)` field-for-field and places the
converted body below it; `pandoc.sh` runs
`pandoc --template=pandoc.typ --pdf-engine=typst`. The memo metadata comes
entirely from front matter, and the body is ordinary Markdown — a numbered
list becomes the memo's numbered paragraphs (see upstream
`examples/pandoc_example.md`).

This app cannot run pandoc: it is a native Haskell binary, and the local-only
contract (no backend, no runtime network beyond own static assets) means any
converter must run in the browser. The app already has the rest of the
pipeline — `compileToPdf` in `src/compile-client.ts` takes Typst source and
returns PDF bytes plus the eform field manifest, and the drop-a-file page
(`src/convert.ts`, `file-compile-page` spec) already handles intake, status,
diagnostics, and download naming.

Repo constraints that shape the design: every runtime dependency is bundled
and must appear in the acknowledgements manifest (`check:acknowledgements`);
there is no unit-test framework — verification lives in `scripts/check-*.mjs`
build gates; the Node toolchain (26.x) runs TypeScript directly via type
stripping; and the armymemo version is pinned identically in the vendored
tarball, the vendor script, the acknowledgements manifest, and the starter
example's `#import`.

## Goals / Non-Goals

**Goals:**

- Accept the same Markdown memo format upstream's pandoc support defines
  (YAML front matter + Markdown body) on the drop-a-file conversion page,
  producing the same signable PDF the equivalent Typst source would.
- Treat upstream `pandoc.typ` as the contract: the converter emits the Typst
  that template would have emitted, so upstream examples work unmodified and
  divergence is detectable.
- Never silently drop content: any Markdown construct the converter does not
  support fails the conversion with a diagnostic naming the construct and its
  location.

**Non-Goals:**

- Running pandoc (or pandoc-wasm) in the browser. Full pandoc is tens of MB of
  wasm32-wasi, would roughly double the PWA precache, needs WASI shim
  plumbing, and adds a GPL component — all to convert documents whose Markdown
  surface is a numbered list. Rejected as machinery far out of proportion.
- Converting Markdown inside the Typst compile via the `cmarker` package.
  Would require vendoring a second Typst package plus confirming typst.ts
  0.7.0 executes Typst WASM plugins, and hides the generated source. The TS
  converter's readable Typst output keeps Typst the single source of truth
  and leaves the door open to "load converted memo into the editor" later.
- A Markdown mode in the editor page, or loading converted Markdown into the
  editor as a draft. Follow-up changes if wanted.
- Pandoc extensions beyond what the memo format needs (footnotes, citations,
  raw blocks, …). Fail-closed keeps these honest: they error rather than
  mis-render.

## Decisions

### D1: Pure-TypeScript converter emitting `pandoc.typ`-equivalent source

A new module, `src/markdown/` (front-matter split, YAML parse, field mapping,
body emitter), converts Markdown text to a Typst string:

```
#import "@local/armymemo:<version>": memo

#show: memo.with(
  office-symbol: "…",
  …
)

<converted body>
```

The field mapping reproduces `pandoc.typ` clause-for-clause: required
`office-symbol`, `subject`, `organization.name`, `author.{name,rank,branch}`;
optional `date`, `suspense`, `author.title`, organization address lines,
`memo-for`/`memo-thru` (lists of `{name, street?, city-state-zip?}` maps),
`authority`, `enclosures` (list) / `enclosures-stated` (bare count, emitted
unquoted — same escape hatch the template documents), `distribution`,
`see-distribution`, `distribution-separate-page`, `cf`, `cf-without-encls`.
Missing required fields produce a single aggregated error listing all of them.
Alternative — calling `memo.with` from app-built Typst data structures without
mirroring the template — was rejected because the template *is* upstream's
Markdown contract; mirroring it makes drift reviewable on vendor bumps (diff
`pandoc.typ`, update mapping).

### D2: Parse Markdown with the CommonMark reference implementation, not by hand

Body conversion uses the `commonmark` package (commonmark.js, the CommonMark
reference implementation — CommonMark-exact by definition) to get an AST,
then a small walker emits Typst markup: ordered lists
→ `+` enum items (nesting preserved — armymemo styles these into AR 25-50
paragraph numbering), unordered lists → `-`, paragraphs, emphasis/strong,
inline code, hard breaks, and links. Scalar metadata values are stringified
the way pandoc does (numbers and dates become plain strings). Any other node
type (images, HTML, block quotes, headings, footnotes, tables for now) throws
a conversion error carrying the construct name and source position — a memo
that renders with content missing is worse than one that fails loudly.
Hand-rolling the parser was rejected (CommonMark edge cases: lazy
continuation, indentation-sensitive nesting, entity handling). The
micromark/mdast stack was considered and rejected at implementation time: it
bundles ~25 packages, each requiring a hand-maintained entry in
`licenses/manifest.json`, whereas commonmark.js bundles three (`commonmark`,
`entities`, `mdurl`) — pure JS, BSD-2-Clause/MIT — for the same
CommonMark-exact parse.

### D3: Front matter via the `yaml` package; escaping mirrors pandoc's Typst writer

Front matter is the leading `---`-delimited block; it is required (its absence
is the clearest "this isn't a Markdown memo" signal and yields a pointed
error). Parsing uses the `yaml` npm package (ISC, zero dependencies, YAML 1.2,
error messages with line/column) — the format upstream defines is YAML with
nested maps and lists, which is not hand-rollable. Metadata strings are
emitted as Typst string literals with `\` and `"` escaped; body text runs are
emitted with backslash escapes for Typst markup-significant punctuation
(`\ # $ * _ ` < > @ [ ] ' " ~ /` and list/term markers at line starts),
mirroring pandoc's own Typst writer escape set so the output matches what
pandoc would produce.

### D4: Extension-based dispatch on the conversion page

`src/convert.ts` inspects the dropped file's name: `.md`/`.markdown`
(case-insensitive) runs the converter and feeds the resulting Typst to the
existing `compileToPdf` path; everything else keeps today's treat-as-Typst
behavior. Conversion failure reuses the existing status + diagnostics pane
("did not convert — nothing downloaded") exactly like a compile failure, and
the download keeps `deriveConvertedFilename`'s swap-extension-to-`.pdf`
naming. Content sniffing (leading `---`) was rejected: a Typst file can begin
with `---` (em-dash markup), and extension dispatch is predictable and
explainable in the page copy. The `file-compile-page` requirement "SHALL NOT
reject a file based on its name or extension" is amended: the name now
*selects the interpretation* — nothing is rejected.

### D5: Conformance gate as a build check, no new test framework

Following the repo's `scripts/check-*.mjs` pattern rather than introducing a
test runner: a `check:markdown-conversion` script imports the converter
directly (Node 26 type stripping), runs it over fixture inputs — chief among
them a vendored copy of upstream `examples/pandoc_example.md` with a
provenance header — and compares against committed golden `.typ` outputs,
plus asserts the error cases (missing front matter, missing required fields,
unsupported constructs) fail with the expected messages. Golden outputs are
compile-verified in the browser once when authored or regenerated. The script
joins the `npm run build` gate chain.

### D6: The emitted version pin joins the single-version enforcement

The converter's `#import "@local/armymemo:<version>"` pin comes from one
exported constant in the new module, and `check-acknowledgements.mjs` (which
already enforces manifest-version == vendored-tarball-version) additionally
verifies this constant and the starter example's `#import` match the tarball.
This turns the vendor script's "all pins must move in one commit" comment into
an enforced invariant instead of adding one more thing to remember on bumps.

## Risks / Trade-offs

- [Converter drifts from upstream `pandoc.typ` / `memo` signature on armymemo
  bumps] → D6 catches version-pin drift mechanically; the vendor-bump
  checklist gains "diff `pandoc.typ` against the mapping"; the vendored
  upstream example fixture catches field-shape breakage at build time.
- [Fail-closed rejects Markdown users expect to work (tables, headings,
  images)] → Error messages name the unsupported construct and its location;
  each construct can be added deliberately later (GFM tables via a micromark
  extension is the likely first). The alternative — silent omission in an
  official memo — is the worse failure.
- [Escaping bugs corrupt body text (stray Typst markup activating, or visible
  backslashes)] → Escape set copied from pandoc's Typst writer rather than
  invented; fixtures include a punctuation-torture document among the golden
  cases.
- [Golden outputs verify conversion, not compilation — a converter change
  could emit Typst that no longer compiles] → Accepted for now (no in-Node
  compile path exists in the repo); goldens are compile-verified in the
  browser when regenerated, and the emitted-source diff in review makes
  regressions visible. If typst.ts's Node compiler is ever added for other
  reasons, the check can grow a compile step.
- [New runtime deps (`yaml`, `commonmark` + its two bundled deps) grow the
  bundle and the acknowledgements surface] → All are small pure-JS libraries
  (well under the WASM assets already shipped); `check:acknowledgements`
  forces the manifest additions, and licenses are ISC/BSD-2-Clause/MIT.

## Open Questions

- None blocking. GFM table support and editor-page Markdown import are noted
  as candidate follow-up changes in the proposal.
