## Context

The worker template in `scripts/generate-sw.mjs` precaches with `cache.addAll(ASSETS)` and serves navigations cache-first, mapping unknown paths to the `/` app shell. Both halves assume the origin serves each precached URL directly. The deployed host instead canonicalizes page URLs (`.html` → extensionless, 308). Two failures follow: the stored response for `/acknowledgements.html` carries `redirected: true`, which per the fetch spec cannot answer a navigation (navigation requests have redirect mode `"manual"`) — WebKit surfaces "Response served by service worker has redirections", Chromium `net::ERR_FAILED`; and navigations to `/acknowledgements` miss the precache list entirely and fall back to the app shell. Reproduced locally with a redirect-simulating server in front of `dist/`.

## Goals / Non-Goals

**Goals:**
- Precached HTML pages render on hosts that canonicalize URLs, in every engine, at both URL forms, online and offline.
- Zero behavior change on plain (non-redirecting) static servers.

**Non-Goals:**
- General multi-hop redirect handling or cross-origin redirects (still excluded by the same-origin guard).
- Changing the site's own link forms (`/acknowledgements.html` stays; the host may canonicalize it or not).

## Decisions

**D1 — Strip the redirect flag at install by re-wrapping the response.** Each asset is fetched individually; when `response.redirected` is set, the body is re-wrapped in `new Response(await response.blob(), { status, statusText, headers })` before `cache.put`. The bytes and metadata are identical — only the internal flag (and final-URL provenance) is dropped, which is exactly the property navigations require. Alternatives rejected: caching under the redirect's *final* URL breaks the match key the fetch handler looks up; fetching with `redirect: "manual"` stores a useless `opaqueredirect`; rewriting site links to pretty URLs just inverts the problem on plain hosts (which 404 extensionless paths).

**D2 — Preserve all-or-nothing install semantics.** The per-asset fetches run under `Promise.all` and any non-OK response throws, failing the install exactly as `cache.addAll` would — a partial precache would violate the offline-completeness requirement.

**D3 — Navigation alias resolution: exact path, then `path + ".html"`, then the `/` app shell.** One extra membership test resolves the pretty form of every precached HTML page (current and future) without any host-specific configuration, and cannot shadow a real asset since the exact path is checked first. On plain hosts extensionless paths were never linked or served, so the added alias is strictly additive.

**D4 — Verification runs the redirect scenario in Chromium.** Chromium enforces the same navigation-response rule (repro fails with `net::ERR_FAILED` before the fix), so a Playwright check against a Cloudflare-style redirecting server proves the fix without a WebKit install; the existing plain-host update-flow and offline checks re-run to show no regression.

## Risks / Trade-offs

- [Per-asset `fetch` + `cache.put` skips `addAll`'s built-in duplicate-request coalescing] → The generated `ASSETS` list is deduplicated by construction (a sorted directory walk).
- [Re-wrapping buffers each asset body in memory during install] → Install already downloads every asset; the largest (compiler WASM, ~11 MiB compressed) is well within worker memory, and non-redirected responses (the overwhelming majority) are put straight through without buffering.
- [Deployed Safari users currently have a tainted cache] → The fixed worker is byte-different, so its install rebuilds a clean cache and the update button (or first Safari visit's update check) swaps it in; no manual cache-clearing required.

## Migration Plan

Normal deploy. No client, markup, or spec-tooling changes; rollback is a revert.

## Open Questions

None.
