## Why

Every edit currently requires a manual Compile click to see its effect, making the edit–preview loop slow and easy to forget (the preview silently goes stale). Recompiling automatically as the user types keeps the preview, diagnostics, and field status continuously current.

## What Changes

- The app recompiles automatically after the user stops editing (debounced), driving the same pipeline as manual Compile: compile → field extraction → esign → preview/status.
- Only one compile runs at a time; edits made during a running compile coalesce into a single trailing recompile so the final result always reflects the latest source.
- The Compile button remains as an immediate "compile now" action (skips the debounce wait); busy state and Download gating behave as today.
- An automatic initial compile runs on page load so first-time visitors see the starter example rendered without any interaction.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `memo-editor`: the "Two-pane layout with action bar" requirement changes — compilation is no longer exclusively user-initiated; edits schedule a debounced automatic compile, page load triggers an initial compile, and the Compile button becomes an immediate trigger of the same pipeline.

## Impact

- `src/main.ts`: compile orchestration gains debounce scheduling, in-flight coalescing, and an on-load initial compile.
- `src/editor.ts`: the editor interface gains a change-notification hook (currently read-only access).
- No changes to `typst-service.ts`, `esign-service.ts`, vendored assets, or the local-only delivery model; auto-compile is purely a scheduling change over the existing local pipeline.
