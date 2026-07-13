## Context

Every runtime asset is already vendored, same-origin, and content-hashed by Vite (`check:local-only` enforces the origin rule per build), so offline support reduces to caching the bundle and serving it when the network is gone. The bundle is large (~30 MB raw, dominated by the compiler WASM) but static hosting plus HTTP caching means the precache mostly copies from the HTTP cache on first visit. The site is served over https (secure context), which service workers require; `file://` remains unsupported (unchanged).

## Goals / Non-Goals

**Goals:**
- Visit once → the app works fully offline thereafter; redeploys propagate silently.
- Precache completeness enforced at build time, like the external-origin scan.
- Zero new runtime or build dependencies; no CDN-delivered tooling (Workbox et al. would need vendoring scrutiny for no gain at this scale).

**Non-Goals:**
- Update-available UI or refresh prompts.
- Runtime caching of anything beyond the built bundle (there is nothing else — no APIs, no remote content).
- Offline support for `npm run dev`.
- Partial/streaming precache; install is all-or-nothing by design.

## Decisions

**D1 — Hand-rolled service worker, generated at build time.** `scripts/generate-sw.mjs` runs after `vite build`, walks `dist/`, and writes `dist/sw.js` containing the complete asset list and a cache name derived from a hash of all listed files' contents. ~60 lines, no dependencies, and the asset list cannot drift from reality because it is derived from it. Alternative — `vite-plugin-pwa`/Workbox — rejected: a large dependency whose generated worker we'd still have to audit against the local-only contract.

**D2 — Cache-first for same-origin GET; navigations serve cached `index.html`.** All assets are content-hashed, so cache-first is always correct for them; `index.html` (unhashed) updates only via the install cycle (D3). Non-GET and cross-origin requests (which don't exist in practice — CSP blocks them) pass through untouched.

**D3 — Standard lifecycle updates, no `skipWaiting`, plus `updateViaCache: "none"`.** A redeploy changes `sw.js` (its embedded hash changes with any content change); the browser re-fetches it on navigation, installs the new cache in the background, and activates on the next load once old pages are gone. Activation deletes stale caches. No prompt UI keeps scope small and behavior predictable; a page is never switched out from under the user mid-session. `updateViaCache: "none"` ensures the static host's HTTP caching of `sw.js` itself can't wedge updates.

**D4 — Precache-completeness check as a sibling script.** `scripts/check-precache.mjs` walks `dist/`, parses the asset list out of `dist/sw.js`, and fails the build naming any uncovered file. Generation (D1) makes this near-tautological — the check exists to catch build-order mistakes (e.g. a future plugin emitting files after the generator runs) and clarify intent, mirroring how `check:local-only` guards the origin rule. Build becomes: `tsc && vite build && generate-sw && check:local-only && check-precache`.

**D5 — Static manifest + SVG icon from `public/`.** `manifest.webmanifest` (standalone display, start_url `/`) and a single `icon.svg` (`sizes: "any"`) copied verbatim by Vite. SVG avoids binary icon generation tooling; Chromium accepts SVG manifest icons for install. If a target browser someday demands PNG, that's a follow-up asset, not a design change.

**D6 — Registration in `main.ts`, production-only, after load.** `if (import.meta.env.PROD && "serviceWorker" in navigator)` register `/sw.js` on window `load`, so registration never competes with the first compile's WASM fetch. Dev mode has no `sw.js` and skips registration entirely.

## Risks / Trade-offs

- [~30 MB precache on first visit] → The visitor was downloading those bytes to use the app anyway; `cache.addAll` mostly reads the HTTP cache. Install failure (quota, eviction) just means "no offline yet" — the app itself is unaffected and the next visit retries.
- [Silent updates mean a user can be one version behind] → Accepted per proposal; the following load is current. Nothing here is security-critical enough to force-refresh for.
- [Stale `index.html` served by SW while a fresh deploy exists] → Inherent to offline-first; bounded to exactly one load by D3.
- [Browser storage eviction can silently drop the cache] → The SW falls through to network on cache miss; offline capability degrades, correctness never does.
