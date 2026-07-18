# Proposal: add-typst-compilation

## Why

The editor shell can accept Typst source but can't do anything with it. This change makes the app actually produce a document: compile the user's memo source to PDF entirely in the browser, with the `armymemo` package available so real AR 25-50 memos render correctly.

## What Changes

- Integrate a WebAssembly build of the Typst compiler (e.g., typst.ts) into the app, loaded from the site's own bundle (no CDN, keeping the local-only guarantee).
- Vendor the `armymemo` Typst package into the compiler's virtual filesystem so `#import "@preview/armymemo:<version>"` resolves without network package downloads.
- Wire the Compile action: editor contents → Typst compile → PDF bytes held in memory.
- Render the compiled PDF in the preview pane and enable a Download button for the plain (not yet signable) PDF.
- Surface Typst compile errors and warnings in the UI with file/line context so users can fix their source.

## Capabilities

### New Capabilities
- `typst-compilation`: In-browser compilation of user Typst source to PDF, including armymemo package resolution and diagnostic (error/warning) reporting.
- `pdf-output`: Presenting the compiled result — in-page PDF preview and download of the produced PDF with a sensible filename.

### Modified Capabilities
- `memo-editor`: The Compile action becomes live; the editor gains a compile-in-progress/disabled state and displays diagnostics tied to source locations.

## Impact

- New vendored runtime dependencies: Typst WASM compiler bundle and the armymemo package files (pinned versions checked into or fetched at build time into the repo).
- Bundle size grows materially (Typst WASM + fonts); build config must handle WASM assets and font embedding.
- Key risk to resolve in design: chosen Typst WASM wrapper must support both PDF export and metadata queries (needed by the next change), and must embed the fonts armymemo expects.
