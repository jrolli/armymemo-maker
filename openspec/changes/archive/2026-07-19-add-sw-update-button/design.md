## Context

`scripts/generate-sw.mjs` emits a hand-rolled service worker that precaches the whole bundle into a content-hash-named cache and serves everything cache-first. The update half of the lifecycle is the browser default: on a later online visit the browser re-fetches `/sw.js` (registration uses `updateViaCache: "none"`, so the HTTP cache can't wedge it), and a byte-different worker installs its new cache — then waits until every tab of the site closes before activating. Nothing in the page surfaces that waiting state, and navigations are served cache-first from the old cache, so refreshing never yields the new version. Users are effectively pinned until they close all tabs.

The fix has to respect the app's standing constraints: fully offline after first visit, no requests beyond the site's own origin, and no disruption to a user mid-edit (the editor auto-compiles and holds work in progress; drafts persist via `draft-store`).

## Goals / Non-Goals

**Goals:**
- A user on a stale version learns an update exists and can apply it with one click.
- The version swap happens only on that explicit click — never an unsolicited reload.
- Loads stay cache-first and instant; offline behavior and precache enforcement are untouched.
- Long-lived tabs and installed (standalone PWA) windows — which rarely navigate — still discover updates.

**Non-Goals:**
- Network-first navigation or any change to fetch/caching strategy.
- Version numbers, changelogs, or update metadata in the UI (the control just says an update is ready).
- Auto-applying updates on a timer or on next load.

## Decisions

**D1 — Surface the browser's native waiting-worker state; no custom version probe.** The waiting registration *is* the update signal: it exists exactly when a byte-different `sw.js` with a fully precached new bundle is ready. A hand-rolled probe (fetching a version file) would duplicate what the browser already does and add a request pattern to reason about under the local-only CSP. Detection is three hooks in `src/main.ts` on the existing registration promise: `reg.waiting` at load (update found on a previous visit but never applied), `updatefound` → `installing.statechange === "installed"` (update found while this page is open), and each fires only when `navigator.serviceWorker.controller` is non-null so a first-ever install never shows the control.

**D2 — Promotion via a `SKIP_WAITING` message, not `self.skipWaiting()` at install.** Unconditional `skipWaiting()` would swap versions (and delete the old cache) underneath every open page without consent. Instead the generated worker gains a `message` listener that calls `self.skipWaiting()` only when told, and the page sends that message only from the button's click handler. Alternative considered — network-first navigations so a plain refresh jumps versions — rejected because it trades away instant cache-served loads and applies updates without the user choosing to.

**D3 — Reload driven by `controllerchange`, listener attached only inside the click handler.** After `skipWaiting()` the activating worker takes control of the old worker's clients, firing `controllerchange`; a `{ once: true }` listener added on click calls `location.reload()`. Because the listener exists only after a click, no other path (e.g. a future `clients.claim()`) can trigger a surprise reload, and `once` prevents loops.

**D4 — Update discovery for windows that never navigate: `reg.update()` on `visibilitychange` (document becoming visible).** Refresh already triggers the browser's `sw.js` check, but an installed standalone window or a weeks-old pinned tab may never navigate. Re-checking when the window regains visibility covers that with one same-origin request for `sw.js` (~1 KB) per return-to-tab, throttled to at most once per hour in code to keep it polite. Alternative — `setInterval` polling — rejected as wasteful while backgrounded.

**D5 — The control is a button in the footer action bar (`.actions`, alongside Compile / Download PDF), `hidden` by default.** It's an action, and the action bar is where actions live; a toast/banner layer is new UI machinery this page doesn't otherwise need. Label: "Update available"; activating it is safe for user work because the memo source is persisted by draft-store and restored after the reload.

## Risks / Trade-offs

- [A refresh alone no longer eventually lands the new version-by-tab-closure story users may expect] → The button appears at latest on the refresh after a deploy (that refresh performs the `sw.js` check), so the path to the new version is refresh → click; this is strictly more discoverable than today's silent pinning.
- [Applying the update in one tab deletes the old cache while other tabs still run the old page, so a not-yet-fetched lazy asset in those tabs would miss the cache and 404 from the network] → The app auto-compiles on load, which warms the one heavy lazy asset (compiler WASM) immediately; remaining exposure is negligible and bounded to multi-tab users, and those tabs fix themselves on their next reload.
- [Reload on click discards in-memory state (compiled PDF preview, cursor position)] → Draft persistence restores the source; the auto-compile on load regenerates the preview. The reload is user-initiated, so the loss is expected.
- [`check-precache.mjs` may assert on the generated worker's exact contents] → Task includes updating that check in the same commit so `npm run build` stays green.

## Migration Plan

Ships as a normal deploy; no data migration. Users currently pinned to an old version get the button on their first visit after *two* deploys (the first deploy containing this change installs as a waiting worker under the old page code, which has no button; once it eventually activates, all later updates are surfaced). Rollback is a revert and redeploy — the message listener and button are inert without each other.

## Open Questions

None.
