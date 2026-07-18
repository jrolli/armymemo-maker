# Proposal: setup-webapp-shell

## Why

memo.army.dev needs a place to live before any Typst or PDF work can happen: a fully client-side, static webapp where someone can type or paste the contents of a Typst memo file. Building the shell first — with the "everything runs locally in the browser" constraint baked in from day one — keeps every later change (Typst WASM, esign WASM) additive rather than architectural.

## What Changes

- Scaffold a static webapp (build toolchain, TypeScript, no backend) whose production output is a self-contained bundle of static files.
- Add the core page layout: a Typst source editor pane (textarea or code editor) and an output/preview pane, plus a disabled-for-now action area (Compile / Download) that later changes will wire up.
- Pre-fill the editor with a minimal example armymemo document so a first-time visitor sees the expected input shape.
- Establish the local-only guarantee: no network calls at runtime beyond fetching the site's own static assets; no analytics, no third-party CDNs — all dependencies vendored into the bundle.
- Add a local dev server workflow and a production build that can be served from any static host or opened from disk.

## Capabilities

### New Capabilities
- `memo-editor`: The Typst source input surface — editing, starter example content, and the surrounding page layout with output and action areas.
- `local-delivery`: The static, local-only delivery model — self-contained bundle, no runtime network dependencies, no data leaving the browser.

### Modified Capabilities

(none — first change in the project)

## Impact

- New codebase: static site scaffold (e.g., Vite + TypeScript), source under `src/`, static build output under `dist/`.
- New dev dependencies: build toolchain only; zero runtime services.
- Sets the architectural contract every subsequent change relies on: all document processing happens in the browser.
