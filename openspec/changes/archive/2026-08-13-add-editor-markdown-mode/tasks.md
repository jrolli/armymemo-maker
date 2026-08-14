## 1. Markdown starter example

- [x] 1.1 Create `src/assets/example.md`: the `example.typ` memo expressed as YAML front matter + numbered-list body (design D4)
- [x] 1.2 Add the example to `check:markdown-conversion` as a fixture input with a committed golden output, and confirm `npm run check:markdown-conversion` passes

## 2. Mode-aware draft store

- [x] 2.1 Extend `src/draft-store.ts` with per-mode draft keys (`draft@v1` stays the Typst draft; new `draft.markdown@v1`) and a `mode@v1` key with the unknown-value→Typst fallback, keeping every access guarded (design D3)

## 3. Editor page UI and wiring

- [x] 3.1 Add the Typst/Markdown radio-group control to the editor pane header in `index.html` and style it in `src/style.css`, including mode-following pane heading and textarea `aria-label` (design D1)
- [x] 3.2 Wire mode state in `src/main.ts`: restore persisted mode on load, restore the active mode's draft-or-example, and on toggle switch the save target first, then load the incoming mode's draft-or-example and let the debounced recompile run (design D3)
- [x] 3.3 In `compileOnce`, convert the snapshot with `convertMarkdownMemo` when in Markdown mode, feed the converted Typst to both `compileToPdf` and `deriveDownloadFilename`, and surface `MarkdownConversionError` in the diagnostics pane without invoking the compiler, leaving prior output and Download untouched (design D2)

## 4. Verification

- [x] 4.1 `npm run build` passes (type-check, markdown-conversion, local-only, precache, asset-size gates)
- [x] 4.2 In-browser check: first visit defaults to Typst and behaves as before; switching to Markdown shows the Markdown example and compiles it to a signable PDF
- [x] 4.3 In-browser check: per-mode drafts survive toggling both ways and a reload restores the last mode with its own draft; a pre-existing `draft@v1` value still loads as the Typst draft
- [x] 4.4 In-browser check: a Markdown conversion error (e.g. deleted front matter) shows in the diagnostics pane while the previous PDF stays downloadable, and a Markdown memo's download is named from its subject
