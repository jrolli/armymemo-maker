## Why

On the production host — which, Cloudflare-style, 308-redirects `/acknowledgements.html` to the pretty URL `/acknowledgements` — the service worker breaks the acknowledgements page for everyone. `cache.addAll` follows the redirect and stores a response whose redirect flag is set; the fetch spec forbids answering a navigation with such a response, so Safari fails with "Response served by service worker has redirections" (user-reported) and Chromium fails the same navigation with `net::ERR_FAILED` (confirmed by local reproduction against a redirect-simulating server). Separately, the pretty URL `/acknowledgements` — the form the host's redirect pushes users toward — is not in the precache list, so navigations to it get the main app shell instead of the acknowledgements page.

## What Changes

- The generated worker's install step replaces `cache.addAll` with per-asset fetches that re-wrap any `redirected` response in a fresh `Response` (same body, status, headers) before `cache.put`, stripping the flag that navigations may not carry. Non-OK responses still fail the whole install, preserving `addAll`'s all-or-nothing semantics.
- The navigation branch of the fetch handler resolves pretty-URL aliases: serve the precached entry for the exact path, else for `path + ".html"`, else the `/` app shell — so both URL forms of a precached page work, online and offline, on redirecting and plain hosts alike.
- The ad-hoc browser verification gains a redirect-host scenario (a static server that canonicalizes `.html` URLs) alongside the existing plain-host checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-delivery`: gains an ADDED requirement covering URL-canonicalizing static hosts — precached pages must serve to navigations without redirect-flagged responses, and both the `.html` and extensionless forms of a precached page must resolve to that page. Existing requirements are unchanged.

## Impact

- `scripts/generate-sw.mjs` — install and fetch handler in the generated worker template (`check-precache.mjs` parses only the `ASSETS` array literal, which is unchanged in shape).
- No client (`src/`) or markup changes.
- Deployed users with a tainted cache recover via the normal update cycle: the fixed `sw.js` is byte-different, installs a fresh clean cache, and the update button swaps it in.
