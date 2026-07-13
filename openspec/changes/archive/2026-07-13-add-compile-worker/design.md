## Context

`typst-service.ts` (compiler init, compile, query) and `esign-service.ts` (esign WASM) run on the main thread; `main.ts` calls them directly and layers single-flight/debounce orchestration on top (add-auto-compile D3). WASM execution blocks the event loop, so a compile freezes typing — noticeable now that compiles self-start on typing pauses. Neither service touches the DOM; both load everything via same-origin `fetch`, so they are worker-compatible as-is.

## Goals / Non-Goals

**Goals:**
- Main thread never runs compiler/esign WASM; typing stays smooth during compiles.
- Zero behavior change at the UI and spec level; `main.ts` orchestration untouched beyond import swaps.

**Non-Goals:**
- Compile cancellation (a running worker compile still finishes; coalescing already handles staleness).
- Parallel compiles, worker pools, or moving PDF preview/blob handling off-thread.
- SharedArrayBuffer/threads inside the compiler.

## Decisions

**D1 — One dedicated module worker hosting both services.** `compile-worker.ts` imports `typst-service` and `esign-service` unchanged and dispatches `{id, op}` request messages (`compile`, `add-fields`). One worker keeps the compiler's ~28 MB WASM instance single; the page's existing single-flight gate means it never sees concurrent requests anyway. Alternatives — a worker per service (double WASM memory for nothing) or Comlink (a dependency for two RPCs) — rejected.

**D2 — Thin promise RPC client with matching signatures.** `compile-client.ts` exposes `compileToPdf(source)` and `addFields(pdf, fields)` with the same signatures/types as the services (types imported type-only, so nothing heavy lands in the main bundle). Request ids map responses to pending promises; worker-side errors reject, preserving `addFields`'s throw-on-failure contract that `toOutputPdf` relies on. The worker is created lazily on first call, keeping startup cost where it was (first compile).

**D3 — `deriveDownloadFilename` moves to `download-filename.ts`.** It is pure string logic needed by `main.ts`; leaving it in `typst-service.ts` would drag the compiler module graph back into the main bundle. Move, not re-export.

**D4 — Vite worker bundling.** `new Worker(new URL("./compile-worker.ts", import.meta.url), { type: "module" })` with `worker: { format: "es" }` in `vite.config.ts` (the typst.ts graph uses dynamic imports, which the default iife worker format rejects). Output chunks stay same-origin and hashed; `check:local-only` covers them like any other asset. CSP needs no edit: `default-src 'self'` governs worker creation, and the document's meta-delivered CSP does not constrain the worker's own internal startup eval (meta CSP binds only the document).

**D5 — Structured clone, no transfer lists.** Compiled PDFs are ~10–100 KB; clone cost is trivial and keeping buffers unneutered avoids aliasing surprises (e.g. the page reusing `outcome.pdf` after passing it to `add-fields`).

## Risks / Trade-offs

- [Worker crash (OOM, script error) would strand pending promises] → The client rejects the pending request on worker `error` events; the existing catch paths surface it like any compile failure, and the next request lazily respawns a fresh worker.
- [First compile still slow (WASM download + init)] → Unchanged from today by design; off-thread init at least no longer freezes the page during it.
- [Meta-CSP not applying inside the worker weakens eval containment there] → The worker runs only same-origin bundled code; script sources remain 'self', which is the contract's actual guarantee (documented in vite.config.ts).
