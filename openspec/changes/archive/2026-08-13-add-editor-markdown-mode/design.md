## Context

The editor page (`src/main.ts`, `memo-editor` spec) is Typst-only: one
textarea behind the narrow `Editor` interface, a debounced single-flight
compile loop, a single localStorage draft (`memo.army.dev/draft@v1`,
add-draft-persistence), and a Typst starter example (`src/assets/example.typ`)
restored when no usable draft exists. The Markdown-to-Typst converter from
add-markdown-input (`src/markdown`: `convertMarkdownMemo`,
`MarkdownConversionError`) is already wired into the drop-a-file conversion
page and emits readable Typst that flows through `compileToPdf` unchanged; its
proposal explicitly deferred "a Markdown mode in the editor page" as a
follow-up. This change is that follow-up.

Repo constraints that shape the design: no unit-test framework — verification
lives in the `scripts/check-*.mjs` build gates (`check:markdown-conversion`
already runs fixture inputs against golden Typst outputs); all pins on the
armymemo version must move together on vendor bumps; the local-only contract
forbids any new runtime network surface.

## Goals / Non-Goals

**Goals:**

- Let a user author a memo in Markdown in the editor with the full live loop:
  debounced auto-compile, preview, signable-PDF download, draft persistence.
- Reuse `convertMarkdownMemo` exactly as the conversion page does, so the two
  Markdown entry points can never disagree about the format.
- Never destroy work on a mode switch: each mode keeps its own draft.

**Non-Goals:**

- Translating content between formats (Typst→Markdown or a "carry my
  converted Markdown into the Typst editor" action) — candidate follow-up.
- Showing the emitted Typst for a Markdown draft — candidate follow-up.
- Any change to the converter, the conversion page, the compile pipeline, or
  syntax-aware editing (highlighting, linting).

## Decisions

### D1: Mode is page-level UI state; the converter and `Editor` stay untouched

A two-option segmented control (radio group labeled Typst / Markdown) in the
editor pane header selects the source format. `src/main.ts` owns the mode
state; the `Editor` interface, `src/markdown`, and `compileToPdf` are used
as-is. The pane heading and the textarea's `aria-label` follow the mode
("Typst source" / "Markdown source"). A radio group was chosen over a
`<select>` or a single toggle button because both options stay visible —
discoverability is the point of the feature — and radios carry the
selected-state semantics for free.

### D2: Conversion happens inside the compile snapshot

`compileOnce` already snapshots the editor source so the download filename
matches the compiled bytes (add-subject-download-filename D2). In Markdown
mode the snapshot is converted first: `convertMarkdownMemo(source)` and the
*converted Typst* then feeds both `compileToPdf` and
`deriveDownloadFilename` — the converter emits the subject as a Typst string
literal (add-markdown-input D3), so subject-based naming behaves identically
in both modes with no new parsing. A `MarkdownConversionError` short-circuits
before the compiler: its message goes to the existing diagnostics pane
exactly like compile diagnostics, the field-status line hides, and the last
successful output's Download stays as it was — mirroring how a failed compile
behaves today. Converting on every keystroke instead was rejected: the
compile loop's debounce/coalescing already bounds work, and a second
conversion trigger would create two sources of truth for "what failed".

### D3: Per-mode drafts plus a persisted mode key

`src/draft-store.ts` becomes mode-aware: the existing
`memo.army.dev/draft@v1` key keeps meaning "the Typst draft" (existing drafts
survive with no migration), a sibling `memo.army.dev/draft.markdown@v1` holds
the Markdown draft, and `memo.army.dev/mode@v1` holds `"typst"` or
`"markdown"` (any other or missing value → Typst, so the default and the
corruption fallback coincide). All accesses keep the guarded
degrade-to-non-persistence behavior. On toggle, the handler switches the
current mode *first* (so the save subscription targets the new mode's key),
then loads that mode's draft — falling back to that mode's starter example —
into the editor via `setSource`, which triggers the normal debounced
recompile; the outgoing mode's draft was already saved on its last edit. A
single shared draft reinterpreted per mode was rejected: flipping the switch
would instantly turn a valid memo into a conversion error and invite
overwriting one format's work with the other's.

### D4: Markdown starter example as a build-gated fixture

New `src/assets/example.md` mirrors `src/assets/example.typ` — same memo
content expressed as YAML front matter plus a numbered-list body — imported
with `?raw` like the Typst example. It joins `check:markdown-conversion` as a
fixture input with a committed golden output, so `npm run build` mechanically
proves the shipped example converts, and the golden's `#import` pin rides the
existing regenerate-goldens step on armymemo bumps. Reusing the vendored
upstream `pandoc-example.md` fixture as the asset was rejected: the starter
examples should visibly be the same memo in two syntaxes, and the upstream
fixture's provenance header plus divergent field values would leak into the
first-run experience.

## Risks / Trade-offs

- [Users expect the toggle to *translate* their draft, not swap surfaces] →
  Per-mode drafts make the switch lossless in both directions; the pane
  heading and example content change visibly with the mode. A real
  translation action stays available as a follow-up.
- [Mode-switch ordering bug cross-saves a draft under the wrong key] → The
  switch-mode-then-setSource sequence in D3 is the single place ordering
  matters; verified by an in-browser check (edit in each mode, toggle,
  reload) before archiving.
- [Markdown-mode diagnostics differ in shape from Typst compile diagnostics]
  → Accepted: `MarkdownConversionError` messages already carry line/column
  context (add-markdown-input), and reusing the pane keeps one error surface.
- [`draft.markdown@v1` orphaned if the feature is later removed] → Accepted;
  the guarded reads mean stale keys are inert.

## Open Questions

- None blocking.
