## Context

The editor is seeded with the starter example at startup (`editor.setSource(exampleSource)` in `main.ts`) and nothing outlives the page. The editor already exposes `onChange` (used by auto-compile's debounce), and the initial automatic compile (add-auto-compile D5) renders whatever the editor holds at startup. There is no backend by design, so browser storage is the only persistence option.

## Goals / Non-Goals

**Goals:**
- A draft typed on this machine survives reload/crash/restart and is what the initial compile renders.
- Zero behavior change when storage is unavailable; the local-only contract is untouched.

**Non-Goals:**
- Multiple named drafts, history/undo, or export/import of drafts.
- Cross-device or cross-browser sync (no backend exists).
- A "reset to example" UI control (clearing the editor and reloading achieves it via the blank-draft rule).

## Decisions

**D1 — `localStorage`, versioned key.** Store the raw source string under `"memo.army.dev/draft@v1"`. localStorage is synchronous, same-origin, survives restarts, and a memo source (tens of KB at most) is far below quota. Alternatives — IndexedDB (async ceremony for one string), cookies (size limits, sent on requests… except there are no requests, but still wrong tool) — rejected. The `@v1` suffix leaves room to change the format without misreading old data.

**D2 — Save on every edit, no debounce.** The `onChange` handler writes the full source synchronously. A localStorage write of a memo-sized string is microseconds; debouncing would only widen the window where a crash loses keystrokes. Auto-compile's 500 ms debounce is unrelated and unchanged.

**D3 — Restore-or-example at startup.** Startup becomes `editor.setSource(draft ?? exampleSource)` where a draft is usable only if non-empty after trimming. The blank-draft rule doubles as the escape hatch back to the example (clear editor, reload). Restore happens before the save subscription is wired, so restoring never re-saves.

**D4 — All storage access behind try/catch in a tiny `draft-store.ts` module.** `loadDraft(): string | undefined` and `saveDraft(source): void` swallow all storage exceptions (Safari private-mode quota errors, `window.localStorage` access throwing when disabled) and return undefined/no-op. Keeps `main.ts` to wiring and makes degradation a property of the module, not each call site.

## Risks / Trade-offs

- [A stale draft hides the starter example from users who wanted a fresh start] → Clearing the editor and reloading restores the example (D3); acceptable without extra UI.
- [Draft saved mid-crash could be half-typed garbage] → It compiles to diagnostics like any live edit; the user's text is still recovered, which is the point.
- [Shared-machine privacy: drafts linger in the browser profile] → Inherent to any local persistence; same trust boundary as browser history. Nothing leaves the device.
