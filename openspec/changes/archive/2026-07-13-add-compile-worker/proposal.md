## Why

Typst and esign WASM currently execute on the main thread, so every compile freezes the page for its duration — and since add-auto-compile, compiles start themselves whenever the user pauses typing, turning that freeze into a recurring caret hitch when typing resumes mid-compile. Moving compilation off the main thread makes editing always smooth.

## What Changes

- The whole compile pipeline (Typst compile, `<esign-field>` query, esign field application) runs in a dedicated same-origin Web Worker; the page communicates with it by message passing.
- The editor and all UI remain responsive (typing, scrolling, button feedback) while a compile is in flight.
- No user-visible behavior changes otherwise: identical outputs, diagnostics, statuses, busy state, and the local-only contract (the worker is part of the app's own bundle; no new origins, no new network traffic).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `typst-compilation`: gains a requirement that compilation runs off the main thread and the UI stays responsive during compiles. Existing requirements are unchanged.

## Impact

- New `src/compile-worker.ts` (worker entry) and `src/compile-client.ts` (promise-based RPC wrapper the page calls).
- `src/main.ts`: swaps direct `typst-service`/`esign-service` imports for the client wrapper; orchestration (single-flight, debounce, statuses) unchanged.
- `src/typst-service.ts`: `deriveDownloadFilename` moves to a new pure module (`src/download-filename.ts`) so the main bundle no longer pulls in the compiler service.
- `vite.config.ts`: worker output format set to ES modules; CSP unchanged (`default-src 'self'` already covers same-origin workers).
