## Why

A refresh, tab crash, or accidental navigation currently discards the user's memo source with no recovery — real work is lost, and there is no server to recover it from by design. Persisting the draft locally closes the last data-loss gap in the edit loop.

## What Changes

- The editor's source is saved to browser `localStorage` as the user edits, and restored on the next page load, so a draft survives reloads, crashes, and browser restarts on the same machine.
- The starter example now appears only when no usable saved draft exists (first visit, cleared storage, or an empty/whitespace-only draft); returning users see their own draft, which the initial automatic compile then renders.
- Storage failures (private browsing, disabled or full `localStorage`) degrade silently to today's non-persistent behavior — the app never breaks over persistence.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `memo-editor`: the "Starter example content" requirement changes — the example pre-fills only when no saved draft exists — and a new "Draft persistence" requirement covers saving on edit, restoring on load, and graceful degradation without storage.

## Impact

- `src/main.ts`: initialization chooses draft-or-example and wires edit events to draft saves.
- New `src/draft-store.ts`: small load/save wrapper over `localStorage` with failure handling.
- No changes to compilation, extraction, esign, or delivery. `localStorage` is same-origin and on-device, so the local-only contract (document contents never leave the browser) is preserved.
