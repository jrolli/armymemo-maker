## Why

The editor page is Typst-only; Markdown authoring — the lower-barrier format —
currently exists only on the drop-a-file conversion page, so Markdown authors
lose the editor's live preview, draft persistence, and iterate-as-you-type
loop. The in-browser Markdown-to-Typst converter already exists
(`src/markdown`, from add-markdown-input); this change was explicitly deferred
there as a follow-up ("a Markdown mode in the editor page").

## What Changes

- Add a source-format toggle (Typst / Markdown) to the editor pane. In
  Markdown mode the editor holds a Markdown memo (YAML front matter +
  CommonMark body); before each compile the source is converted with the
  existing `convertMarkdownMemo`, and the resulting Typst flows through the
  unchanged compile → field-extract → signable-PDF pipeline.
- Markdown conversion failures (bad or missing front matter, unsupported
  constructs) are surfaced in the editor's existing diagnostics pane exactly
  like compile diagnostics, without invoking the compiler.
- Each mode keeps its own draft and its own starter example: switching modes
  swaps the editor content to the other mode's draft (or that mode's example
  when no usable draft exists), so toggling never destroys work. The selected
  mode itself persists across reloads alongside the drafts, with the same
  storage-unavailable graceful degradation as today.
- Add a minimal, valid Markdown starter example asset mirroring the existing
  Typst example memo.
- In Markdown mode the download filename derives from the converted Typst
  source, so the subject-based naming behaves identically in both modes.

Out of scope (possible follow-ups): showing the emitted Typst for a Markdown
draft, and a one-way "convert my Markdown draft into the Typst editor" action.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memo-editor`: The editing surface gains a persisted Typst/Markdown mode
  toggle with per-mode drafts and starter examples; compilation in Markdown
  mode converts before compiling and reports conversion errors in the
  diagnostics area; download naming in Markdown mode derives from the
  converted source.

## Impact

- `src/main.ts`: mode state, conversion step ahead of `compileToPdf`, and
  conversion-error handling in the compile path.
- `src/draft-store.ts`: per-mode draft keys plus a persisted mode key; the
  existing `@v1` draft key keeps meaning "the Typst draft" so existing drafts
  survive unchanged.
- `index.html` + `src/style.css`: the toggle control in the editor pane
  header and mode-aware labels/aria text.
- New `src/assets/example.md` starter example; unit/e2e coverage for mode
  switching, per-mode persistence, and conversion-error surfacing.
- No changes to `src/markdown` (converter used as-is), the compile pipeline,
  vendored payloads, the service worker, or the local-only checks. No new
  dependencies, so the acknowledgements manifest is untouched. The emitted
  `#import` version pin already tracks armymemo bumps via `ARMYMEMO_VERSION`.
