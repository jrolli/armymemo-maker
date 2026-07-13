# Self-hosting memo.army.dev

This archive contains a complete, ready-to-serve build of
[memo.army.dev](https://memo.army.dev), a fully client-side webapp for
producing signable AR 25-50 Army memo PDFs. There is no backend: serve the
static files and the app is fully functional, with no other infrastructure.

`BUILD_INFO` (next to this file) records the source commit, the tag if this
build came from one, and the build date.

## How to serve it

Serve the contents of the `site/` directory — exactly as-is, nothing added or
removed — with any plain static file server. For example:

```sh
python -m http.server -d site 8000
```

then open <http://localhost:8000>.

Three constraints:

1. **Serve `site/` at the root of the origin.** The app uses absolute (`/`)
   asset URLs and registers its service worker at scope `/`, so it must live
   at `https://example.org/`, not `https://example.org/memo/`. Subpath
   hosting is not supported.
2. **Use https or localhost for offline support.** The app is a PWA: on first
   visit a service worker precaches the entire bundle, after which it works
   with no network at all. Service workers require a secure context, so
   offline support needs https (or `http://localhost` for local use). Over
   plain http on another host the app still works — it just won't be
   available offline.
3. **Don't open `site/index.html` via `file://`.** Browsers block WASM
   subresource loading from disk; the app must be served over http(s).
