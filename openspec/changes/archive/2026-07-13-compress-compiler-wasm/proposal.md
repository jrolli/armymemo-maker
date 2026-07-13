## Why

The production bundle contains one file that no common static host budget can ignore: the Typst compiler WASM at ~27 MiB (`typst_ts_web_compiler_bg-*.wasm`). Cloudflare (the intended host for memo.army.dev) rejects any uploaded file larger than 25 MiB, which blocks deployment outright. Gzipping that one file brings it to ~11 MiB, comfortably under the limit — and the browser can decompress it natively at load time without weakening the local-only contract.

## What Changes

- The production build emits the Typst compiler WASM pre-compressed with gzip (`.wasm.gz`) instead of raw; all other assets are unchanged.
- The runtime loader fetches the compressed asset same-origin and decompresses it in the browser via `DecompressionStream("gzip")`, streaming directly into `WebAssembly.instantiateStreaming` (wasm-bindgen accepts a `Response`), so no full uncompressed copy is buffered in JS.
- Dev mode (`npm run dev`) continues to serve the raw WASM from `node_modules`; the loader handles both forms.
- A new build check fails the build if any file in `dist/` exceeds 25 MiB, making the host-compatibility constraint durable rather than a one-time fix (same style as `check:local-only` and `check:precache`).
- Side effects, both favorable: the service worker precaches ~11 MiB instead of ~27 MiB for this asset, and transfer size no longer depends on the host's on-the-fly compression (which CDNs commonly skip for files this large).

Not changing: no `Content-Encoding: gzip` static-serving tricks — those depend on host header behavior and would break the "works from any plain static file server" requirement. Decompression is explicit in app code, keeping the bundle host-agnostic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-delivery`: add a requirement that no file in the production bundle exceeds the 25 MiB static-host per-file limit, enforced by a build-time check that fails and names the offending file. (Existing requirements — self-contained bundle, no external origins, offline precache completeness — are unchanged and must keep holding for the compressed asset.)

`typst-compilation` is intentionally not modified: how the compiler WASM is encoded on disk and inflated at load time is implementation detail beneath its requirements, which already pin the observable behavior (same-origin fetches only, compile works, worker-hosted).

## Impact

- `vite.config.ts` — new build plugin that gzips the emitted compiler `.wasm` asset to `.wasm.gz`, drops the original, and rewrites the referencing chunk(s).
- `src/typst-service.ts` — `getModule` becomes a fetch + `DecompressionStream` pipeline returning a `Response` (dev/raw vs. prod/gzip branch).
- `scripts/` — new `check-asset-size.mjs` wired into `npm run build` as `check:asset-size`.
- `scripts/generate-sw.mjs` / `scripts/check-precache.mjs` — must be verified to cover the renamed `.wasm.gz` asset (expected to work unchanged; they scan `dist/`).
- `README.md` — vendored-assets section updated to describe the compressed shipping form.
- Browser baseline: `DecompressionStream("gzip")` requires Chrome 80+/Firefox 113+/Safari 16.4+ — at or below what the compiler WASM already needs, so no effective support change.
- No new dependencies (`node:zlib` at build time, native `DecompressionStream` at runtime).
