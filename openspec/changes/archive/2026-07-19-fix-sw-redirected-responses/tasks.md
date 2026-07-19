## 1. Worker template

- [x] 1.1 In `scripts/generate-sw.mjs`, replace the install handler's `cache.addAll` with per-asset fetches under `Promise.all`: throw on non-OK responses, re-wrap `redirected` responses in a fresh `Response` (same body/status/headers) before `cache.put`
- [x] 1.2 In the fetch handler's navigation branch, resolve the target as exact `path`, else `path + ".html"`, else `/`

## 2. Verification

- [x] 2.1 `npm run build` passes all checks (`check-precache` still parses the ASSETS list)
- [x] 2.2 Playwright against a Cloudflare-style redirecting server (`/acknowledgements.html` → 308 → `/acknowledgements`): precached response has `redirected: false`; navigating to both `/acknowledgements.html` and `/acknowledgements` renders the acknowledgements page, online and offline
- [x] 2.3 Re-run the plain-host update-flow verification (restaged v1/v2 builds) to confirm no regression: first-visit no button, update surfaces, single reload on click, offline compile works
