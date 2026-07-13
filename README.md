# memo.army.dev

A fully client-side webapp for producing signable AR 25-50 Army memo PDFs.
Type or paste [Typst](https://github.com/typst/typst) source using the
[armymemo](https://github.com/jrolli/armymemo) package, and (in upcoming
versions) compile it in-browser and download a PDF with signature form fields
added by [esign](https://github.com/jrolli/esign).

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

## armymemo version pinning

The starter example in [src/assets/example.typ](src/assets/example.typ) imports
`@preview/armymemo:0.1.0`. That version is the contract: when in-browser
compilation lands, the exact same armymemo version gets vendored into the
compiler's package filesystem so the example always compiles. Bump the example
import and the vendored package together.
