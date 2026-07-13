## Context

Compilation today is strictly user-initiated: `main.ts` wires the Compile button to a single async `compile()` handler that runs the full pipeline (Typst compile → field extraction → esign → preview/status) and guards re-entry by disabling the button. The editor (`editor.ts`) exposes read-only access to the source (design D2 of setup-webapp-shell); nothing observes edits. A compile of the starter example takes noticeable time on first run (lazy ~28 MB compiler WASM load) but subsequent compiles are fast enough for a type-and-see loop.

## Goals / Non-Goals

**Goals:**
- Output pane, diagnostics, and field status converge on the latest source without manual action.
- Never run overlapping compiles; never drop the user's final text.
- Keep the manual Compile button as an immediate trigger; keep Download gating and busy-state semantics unchanged.

**Non-Goals:**
- Compile cancellation/abort inside the WASM compiler (a running compile always finishes; staleness is handled by the trailing rerun).
- Incremental compilation, caching, or any typst-service/esign-service changes.
- A user-facing toggle to disable auto-compile.

## Decisions

**D1 — Editor change hook, not polling.** `editor.ts` grows a `onChange(listener)` subscription backed by the textarea's `input` event, keeping the D2 narrow-interface rule: `main.ts` still never touches the textarea directly. Alternative — listening on the DOM node from `main.ts` — rejected as it breaks the editor abstraction.

**D2 — Trailing debounce via `setTimeout`, ~500 ms.** Each `input` event resets a single timer; on expiry the shared compile pipeline runs. 500 ms is long enough to not compile mid-word, short enough to feel live. Alternative — leading-edge or interval-based compilation — rejected: compiles mid-typing produce distracting transient syntax errors.

**D3 — Single-flight with dirty-flag coalescing.** One boolean `compiling` plus one `dirty` flag: if a compile request arrives while `compiling`, set `dirty` instead of starting; when the pipeline finishes, if `dirty` is set, clear it and immediately recompile the *current* editor source. This yields exactly one trailing recompile per burst and always reads the latest text (no queued stale snapshots). Alternative — an abortable queue — rejected as needless complexity without compiler cancellation.

**D4 — Manual Compile = flush.** The button click cancels any pending debounce timer and requests a compile now, through the same single-flight gate. Its enabled/busy behavior is unchanged, so existing memo-editor scenarios still hold.

**D5 — Initial compile on module init.** After wiring, `main.ts` requests a compile of the starter example. This also warms the lazy compiler-WASM load. The button's busy state covers this run like any other.

## Risks / Trade-offs

- [Continuous typing delays feedback indefinitely with a pure trailing debounce] → Accepted: 500 ms pauses occur naturally at word/line boundaries; the Compile button remains a manual flush.
- [Auto-compiles of half-typed source surface transient errors in the diagnostics pane] → Accepted by design (diagnostics replace the preview only on failure, and the next successful compile restores it); debounce keeps churn low.
- [First-load auto compile costs the WASM download immediately rather than on demand] → Acceptable: the page's sole purpose is compiling; warming it improves perceived latency.
