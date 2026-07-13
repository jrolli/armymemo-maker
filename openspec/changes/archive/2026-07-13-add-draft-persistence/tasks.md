## 1. Draft store

- [x] 1.1 Create `src/draft-store.ts` with `loadDraft()`/`saveDraft()` over a versioned localStorage key, all storage access behind try/catch (design D1/D4)

## 2. Wiring

- [x] 2.1 In `src/main.ts`, seed the editor with `loadDraft() ?? exampleSource` (blank/whitespace drafts unusable, design D3), before the save subscription is wired
- [x] 2.2 Subscribe `editor.onChange` to `saveDraft` on every edit (design D2)

## 3. Verification

- [x] 3.1 Headless-browser verify: draft survives reload and is auto-compiled; first visit shows the example; blank draft falls back to the example; disabled localStorage leaves editing/compiling/downloading working with no errors
- [x] 3.2 Run `npm run build` (typecheck + local-only check) cleanly
