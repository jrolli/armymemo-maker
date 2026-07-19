## Why

The service worker serves every load — including deliberate refreshes — cache-first from the version cached at first visit, and a newly installed worker waits until *all* tabs close before taking over. In practice users are pinned to a stale version indefinitely (a refresh never closes the tab), with no indication that a newer version exists and no way to get it short of closing every tab or clearing site data.

## What Changes

- The generated service worker (`scripts/generate-sw.mjs`) gains a `SKIP_WAITING` message handler so the page can promote a waiting (new-version) worker on demand. Install/activate/fetch behavior — cache-first, full-bundle precache, old-cache cleanup — is unchanged.
- The client registration code (`src/main.ts`) detects an update-ready worker (already-waiting at load, or one that finishes installing while the page is open) and reveals an "Update available" button.
- Clicking the button promotes the waiting worker and reloads the page exactly once, landing the user on the new version. No reload ever happens without the click.
- A hidden update button is added to the footer action bar (`index.html` + styling in `src/style.css`).
- **BREAKING (spec-level)**: the `local-delivery` requirement that redeploys reach users "without user-facing update prompts" is replaced — updates are now surfaced with an explicit user-controlled prompt instead of silently applying on a later load.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-delivery`: the "Offline availability after first visit" requirement's update clause changes from "fetch in the background and serve on the following load, without user-facing update prompts" to "surface an update control when a new version is ready; apply it (activate + reload) only when the user activates the control." Offline behavior, precache completeness enforcement, same-origin constraints, and installability are unchanged.

## Impact

- `scripts/generate-sw.mjs` — add the `SKIP_WAITING` message listener to the generated worker template.
- `src/main.ts` — keep the registration promise; wire waiting-worker detection, `updatefound`/`statechange` tracking, button reveal, and click → `postMessage` → `controllerchange` → `location.reload()`.
- `index.html`, `src/style.css` — hidden update button in the footer action bar.
- `scripts/check-precache.mjs` — may need its expectations adjusted if it verifies the worker template's exact shape.
- No new dependencies, no network requests beyond the existing same-origin `sw.js` update check the browser already performs; document contents remain local.
