## Why

Users who keep their memos as `.typ` files on disk (or receive them from someone else) currently have to open the editor, paste the source, wait for a compile, and download — four steps for what is conceptually one operation. A dedicated drop-a-file page turns "I have a Typst memo file, give me the signable PDF" into a single gesture.

## What Changes

- New static page (`convert.html`) with a single large drop zone: drag a Typst source file onto it, or click/keyboard-activate it to open a file browser.
- Dropping/choosing a file compiles it with the existing in-browser Typst pipeline, applies signature fields via esign exactly like the editor flow, and immediately triggers a download of the resulting PDF — no preview, no editor.
- The downloaded PDF is named after the source file with the extension replaced by `.pdf` (e.g. `leave-request.typ` → `leave-request.pdf`).
- Compile errors and esign fallbacks are reported on the page (the plain PDF still downloads when only field application fails; nothing downloads on a compile error).
- The landing page links to the new page, and the new page links back.
- The page ships in the production bundle like every other page: same CSP, precached by the generated service worker, fully offline-capable after first visit.

## Capabilities

### New Capabilities

- `file-compile-page`: The drop-a-file conversion page — file intake (drag-and-drop and click-to-browse), one-shot compile-and-download using the existing compilation/signing pipeline, source-derived output filename, error reporting, reachability from the landing page, and offline delivery.

### Modified Capabilities

<!-- none — the service worker precache list is derived by walking dist/, so a new
     bundle page is covered by existing local-delivery requirements without any
     requirement change; the landing-page link is a requirement of the new
     capability (mirroring how acknowledgements owns its own reachability). -->

## Impact

- New files: `convert.html` (second app HTML entry), `src/convert.ts` (page logic), possibly small CSS additions in `src/style.css`.
- `vite.config.ts`: add the new HTML entry to `build.rollupOptions.input` (CSP injection and last-updated substitution already apply to every HTML entry).
- `index.html`: footer link to the new page.
- Reuses `src/compile-client.ts` (worker RPC) and the esign flow unchanged; no compiler/esign changes.
- `scripts/generate-sw.mjs` and the precache/local-only/asset-size checks need no changes — they operate on whatever `dist/` contains.
