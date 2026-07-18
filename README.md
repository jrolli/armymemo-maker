# memo.army.dev

A fully client-side webapp for producing signable AR 25-50 Army memo PDFs.
Type or paste [Typst](https://github.com/typst/typst) source using the
[armymemo](https://github.com/jrolli/armymemo) package, compile it in-browser
(via [typst.ts](https://github.com/Myriad-Dreamin/typst.ts) WebAssembly),
preview the result, and download the PDF. Signature form fields added by
[esign](https://github.com/jrolli/esign) arrive in an upcoming version.

## The local-only contract

Everything happens in your browser. There is no backend, and at runtime the app
makes **no network requests beyond its own static assets** — no CDNs, no
analytics, no telemetry. Document contents never leave the machine. This is
enforced, not just promised:

- The production `index.html` ships a Content-Security-Policy restricting all
  loads to `'self'`.
- `npm run check:local-only` scans the built `dist/` for external-origin
  references and fails the build on any hit (it runs as part of `npm run build`).

The build is served from any plain static file host (for example
`python -m http.server -d dist`). Opening `dist/index.html` directly via
`file://` is not supported: browsers block WASM subresource loading from disk,
which upcoming Typst/esign features depend on.

## Development

```sh
npm install
npm run dev        # dev server with hot reload
npm run build      # typecheck + production build + local-only check
npm run preview    # serve the production bundle locally
```

## Vendored assets

Everything the compiler needs ships in the bundle:

- **armymemo package** — `vendor/armymemo-0.1.0.tar.gz` (AGPL), regenerated
  from a pinned upstream commit by `node scripts/vendor-armymemo.mjs`. The
  starter example in [src/assets/example.typ](src/assets/example.typ) imports
  `@preview/armymemo:0.1.0`; bump the example import, the vendor script's
  pinned commit, and the tarball together. Only vendored packages resolve —
  other `@preview` imports fail with a diagnostic, by design.
- **Liberation Sans** — `src/assets/fonts/` (SIL OFL, license included),
  selected via armymemo's `font` input as the metric-compatible stand-in for
  Arial. Default typst.ts font fetching (from GitHub) is disabled.
- **Typst compiler WASM** — `@myriaddreamin/typst-ts-web-compiler` 0.7.0
  (~28 MB, ~11 MB gzipped), loaded lazily on first Compile.

Note on CSP: the production policy allows `'unsafe-eval'` in `script-src`
because the compiler WASM's `js_sys::global()` fallback evaluates
`Function("return this")` at startup. Script sources remain `'self'`; no
external origin is loadable.
