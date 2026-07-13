# Design: setup-webapp-shell

## Context

This is the first change in an empty repository. It establishes the codebase for memo.army.dev: a fully client-side static webapp that will (in later changes) compile Typst source with a WASM compiler, extract `<esign-field>` metadata, and apply signature fields via esign WASM. Nothing in this change processes documents yet — it delivers the page shell, the editor surface, and the delivery/build contract that the WASM-heavy changes will plug into.

Hard constraints inherited by everything built here:

- No backend and no runtime network traffic beyond the site's own static assets.
- All dependencies vendored into the bundle — no CDNs, no analytics.
- Document contents never leave the browser.
- The production build must work from any static file host (including `python -m http.server`); `file://` is explicitly out of scope.

## Goals / Non-Goals

**Goals:**

- A reproducible TypeScript + Vite scaffold whose `dist/` output is a self-contained static bundle.
- The two-pane UI: Typst source editor (left) and output/preview placeholder (right), with an action bar (Compile / Download rendered but disabled).
- Starter armymemo example content pre-filled in the editor.
- A mechanically enforced local-only guarantee, not just a stated intention.
- Dev workflow: `npm run dev` (hot reload), `npm run build`, `npm run preview`.

**Non-Goals:**

- Any Typst compilation, PDF rendering, or esign integration (later changes).
- Syntax highlighting / CodeMirror (see Open Questions — the editor contract is designed so this can be swapped in without spec changes).
- Offline installability (service worker / PWA). The bundle is offline-friendly by construction, but caching machinery is deferred.
- Mobile-optimized layout; the target is desktop browsers where PDF signing workflows happen. The layout should merely not break on small screens.

## Decisions

### D1: Vite + vanilla TypeScript, no UI framework

The app is a single page with a textarea, a preview pane, and a couple of buttons. Its complexity lives in the document pipeline (WASM modules), not in UI state. Vanilla TS keeps the vendored surface minimal and avoids framework runtime in the bundle.

- *Alternative — React/Preact/Svelte:* justified only if UI state grows (multi-document tabs, settings panels). The DOM surface here is small enough that a framework is overhead. Revisit if a later change adds real UI complexity.
- *Alternative — no bundler (hand-written ES modules):* rejected; Vite's asset pipeline is exactly what later changes need for `.wasm` files, fonts, and raw-text imports of the starter `.typ` example, and it provides the dev server.

### D2: Plain `<textarea>` for the editor, behind a narrow interface

The shell ships a styled `<textarea>`. All app code accesses it through a small `Editor` module (`getSource(): string`, `setSource(s)`, `onChange(cb)`) so a CodeMirror upgrade later is a drop-in swap that touches one file and no specs.

- *Alternative — CodeMirror 6 now:* fully vendorable and the likely end state, but it front-loads dependency and styling work into a change whose job is the skeleton. Deferred, not rejected.

### D3: Local-only guarantee enforced by CSP + build check

Two mechanisms, both mechanical:

1. A `<meta http-equiv="Content-Security-Policy">` tag in `index.html` with `default-src 'self'` (plus the minimal style allowances Vite's output needs). The browser itself then blocks any accidental third-party fetch. Later WASM changes will extend `script-src` with `'wasm-unsafe-eval'` — noted here so it's an expected edit, not a weakening.
2. A build-time check (`npm run check:local-only`) that scans `dist/` for `https?://` references outside the site's own origin-relative URLs and fails the build on hits.

- *Alternative — policy by convention (code review only):* rejected; the whole value of the constraint is that users can trust it, and a broken promise here is silent.

### D4: Starter content as a vendored `.typ` asset

The example memo lives at `src/assets/example.typ` and is imported with Vite's `?raw` so it stays a real Typst file (editable, lintable, compilable by the armymemo repo's own tooling) rather than a string literal in TS. Pinned to the armymemo version the app will later vendor, so the example compiles unchanged when compilation arrives in `add-typst-compilation`.

### D5: Layout and disabled action contract

CSS Grid two-pane layout with an action bar. Compile and Download render disabled with a tooltip ("coming soon" equivalent) rather than being hidden — the shell defines the complete interaction surface so later changes only flip behavior on, never rearrange layout. The preview pane reserves its region with an empty-state message; change 2 decides how PDF bytes get rendered into it (likely `<iframe>` + blob URL, decided there, not here).

## Risks / Trade-offs

- [Vite emits inline scripts/styles that conflict with a strict CSP] → Verify `vite build` output against the chosen policy in this change; configure `build` options (no inline module preload polyfill, external CSS) as needed. Better to discover CSP friction now than after WASM lands.
- [Starter example drifts from armymemo's current API before change 2 lands] → Pin the intended armymemo version in the example's `#import` line and note it in the repo README; change 2 vendors that exact version.
- [Plain textarea feels too spartan and gets replaced early, churning the shell] → The `Editor` interface (D2) confines any swap to one module; specs describe behavior ("user can edit Typst source"), not the widget.
- [No framework becomes painful if UI grows] → Accepted; the pipeline changes ahead add almost no UI state. Revisit only with evidence.

## Migration Plan

Greenfield — nothing to migrate. First deploy is copying `dist/` to any static host; rollback is redeploying the previous `dist/`. No data, no schema, no server state.

## Open Questions

- **When to adopt CodeMirror 6** — proposed answer: as a small standalone change after the core pipeline works end-to-end, unless textarea friction shows up sooner.
- **Whether to add a service worker for true offline reload** — deferred until the app is feature-complete; it interacts with WASM asset caching and is easier to reason about then.
- **Exact CSP directives Vite's output needs** (e.g., `style-src 'unsafe-inline'` or hashed styles) — resolved empirically during implementation of this change; the requirement (no non-self origins) is fixed, the directive spelling is not.
