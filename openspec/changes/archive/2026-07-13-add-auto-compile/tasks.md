## 1. Editor change notification

- [x] 1.1 Add an `onChange(listener)` subscription to the editor interface in `src/editor.ts`, backed by the textarea's `input` event, without exposing the DOM node

## 2. Compile scheduling

- [x] 2.1 Refactor the Compile click handler in `src/main.ts` into a shared `requestCompile()` entry with single-flight `compiling` + `dirty` coalescing (design D3), rerunning once on the latest source after a busy compile
- [x] 2.2 Wire editor changes to a ~500 ms trailing-debounce timer that calls `requestCompile()` (design D1/D2)
- [x] 2.3 Make the Compile button cancel any pending debounce timer and call `requestCompile()` immediately (design D4)
- [x] 2.4 Trigger the initial automatic compile on page load after wiring (design D5)

## 3. Verification

- [x] 3.1 Manually verify in the browser: initial compile on load, debounced recompile after edits, rapid-edit coalescing (no overlap, final text wins), manual Compile flush, busy state, and Download gating
- [x] 3.2 Run `npm run build` (typecheck + local-only check) cleanly
