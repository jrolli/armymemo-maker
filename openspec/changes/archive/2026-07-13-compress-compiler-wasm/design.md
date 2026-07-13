## Context

The production bundle's largest asset is the Typst compiler WASM,
`typst_ts_web_compiler_bg-<hash>.wasm`, at ~27 MiB (28,325,178 bytes).
Cloudflare rejects uploaded files larger than 25 MiB, blocking deployment.
Gzip brings this file to ~11 MiB. Every other asset is far below the limit
(next largest: esign WASM at ~860 KB).

Current loading path: `src/typst-service.ts` imports the WASM with Vite's
`?url` and hands the URL to typst.ts via
`$typst.setCompilerInitOptions({ getModule: () => compilerWasmUrl })`.
typst.ts passes `getModule()`'s return value straight to wasm-bindgen's
`__wbg_init`, which accepts (verified in
`@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler.mjs`) a URL
string, a `Response` (preferred — used with `WebAssembly.instantiateStreaming`),
bytes, or a promise of any of these. All of this runs inside the compile Web
Worker, off the main thread.

Constraints from existing specs that must keep holding: same-origin-only
fetches (local-delivery, typst-compilation), CSP restricted to `'self'`,
precache completeness for offline use, and "works from any plain static file
server".

## Goals / Non-Goals

**Goals:**

- No file in `dist/` exceeds 25 MiB, so the bundle deploys to Cloudflare (and
  any host with a similar per-file cap).
- The constraint is build-enforced, not a one-time fix: a check fails the
  build if any emitted file crosses the limit.
- Zero change to observable app behavior: compile output, diagnostics,
  offline operation, and the local-only contract are untouched.
- Dev workflow (`npm run dev`) keeps working without a build step.

**Non-Goals:**

- Compressing other assets (fonts, esign WASM, the armymemo tarball — which is
  already a `.gz`). They are nowhere near the limit; transfer compression for
  them remains the host's concern.
- Brotli or other codecs (see D1).
- Relying on HTTP `Content-Encoding` semantics or any host-specific serving
  configuration (see D2).
- Reducing the compiler's uncompressed size (tree-shaking the WASM, splitting
  it, or swapping compilers).

## Decisions

### D1: gzip, not brotli

`DecompressionStream` supports only `gzip`, `deflate`, and `deflate-raw` —
there is no native brotli decoder in browsers. Brotli would need a vendored
WASM decoder: a new dependency, more attack surface, and irony (a decompressor
shipped to decompress the compressor). Gzip already lands at ~11 MiB, less
than half the 25 MiB budget. Decision: gzip via `node:zlib` at build time,
native `DecompressionStream("gzip")` at runtime.
`DecompressionStream` baseline (Chrome 80+, Firefox 113+, Safari 16.4+) is at
or below what the WASM compiler pipeline already requires, and it is available
in Web Workers, where the loader runs.

### D2: explicit in-app decompression, not `Content-Encoding` tricks

The alternative — upload a gzipped body and have the host serve it with
`Content-Encoding: gzip` so the browser inflates transparently — was rejected:
it depends on host-specific header behavior, is exactly the kind of
double-compression/mangling trap CDNs are known for, and breaks the
local-delivery requirement that the bundle works from *any* plain static file
server (`python -m http.server` won't set those headers). Instead the app
fetches `.wasm.gz` as an opaque binary and pipes it through
`DecompressionStream` itself. No CSP change: the fetch is same-origin and the
existing `'unsafe-eval'` note is unrelated.

### D3: build-time transform as a Vite plugin in `generateBundle`

A plugin in `vite.config.ts` (alongside `injectProductionCsp`) hooks
`generateBundle`, and:

1. Finds the emitted asset matching `typst_ts_web_compiler_bg-*.wasm`.
2. Gzips its source with `zlib.gzipSync(source, { level: 9 })` (gzipSync
   writes no mtime, keeping output deterministic for a given input).
3. Emits it under the same name with `.wasm` replaced by `.wasm.gz`, removes
   the original from the bundle, and rewrites every occurrence of the old
   filename in emitted JS chunks (the `?url` import becomes a string literal
   in exactly one chunk).
4. **Fails the build loudly** if it finds zero or multiple matching assets, or
   zero referencing chunks — so a typst.ts upgrade that renames the asset
   can't silently ship a 27 MiB raw file again (the size check is the second
   line of defense).

Applies only to `apply: 'build'`, so the dev server is untouched.
Alternatives considered: pre-gzipping into `vendor/` (drifts from the npm
package; the current file is generated from `node_modules`, keep it that way);
a post-build script rewriting `dist/` (works, but the plugin keeps the
bundle graph consistent so the precache generator and local-only check see the
final truth without ordering subtleties).

### D4: runtime loader sniffs gzip magic bytes, not the file extension

`getModule` becomes an async function: fetch `compilerWasmUrl`, read the first
bytes of the body stream, and check for the gzip magic number (`0x1f 0x8b`).
If present, pipe (that chunk re-prepended, then the rest) through
`DecompressionStream("gzip")`; either way, return a `Response` wrapping the
resulting stream with `Content-Type: application/wasm`, which wasm-bindgen
feeds to `instantiateStreaming` — decompression streams straight into WASM
compilation with no full-file buffering in JS.

Sniffing rather than branching on a `.gz` URL suffix handles every case with
one code path: dev mode (raw file from `node_modules`), production (gzipped),
and the pathological host that auto-applies `Content-Encoding: gzip` to `.gz`
files, causing the browser to inflate transparently before we see the bytes
(the sniff then sees raw WASM `\0asm` and skips inflation instead of
corrupting the stream). A raw `.wasm` that is not valid WASM still fails in
`instantiateStreaming` with its normal error, unchanged from today.

### D5: a permanent `check:asset-size` build gate

New `scripts/check-asset-size.mjs`, mirroring `check-local-only.mjs`: walk
`dist/`, fail listing every file ≥ 25 MiB (the exact limit, 26,214,400 bytes)
with its size. Wired into `npm run build` beside the other checks and into the
`check:*` script family. This encodes the *deployability* constraint
independently of *how* this change satisfies it — if a future asset balloons,
the build says so before a deploy attempt does.

### D6: service worker and checks ride along unchanged

`generate-sw.mjs` and `check-precache.mjs` derive their lists from the actual
`dist/` contents, so the `.wasm.gz` file is precached automatically and the
raw `.wasm` no longer exists to cache. Net effect: the offline install
shrinks by ~16 MiB. Verification (not modification) of both scripts is part
of the tasks.

## Risks / Trade-offs

- [Chunk rewrite misses a reference / asset renamed by dependency upgrade] →
  the plugin fails the build on zero-or-many matches (D3), and
  `check:asset-size` (D5) independently catches a raw compiler WASM slipping
  through.
- [typst.ts changes its `getModule` contract] → versions are pinned; the
  contract (`Response` accepted, promise awaited) was verified against the
  installed `typst_ts_web_compiler.mjs`, and any regression fails at first
  compile in the browser verification suite, not silently.
- [Host serves `.wasm.gz` with `Content-Encoding: gzip`, browser pre-inflates]
  → magic-byte sniff (D4) degrades gracefully to pass-through.
- [Cold-load cost of inflating ~27 MiB in the worker] → tens of milliseconds,
  overlapped with streaming WASM compilation; negligible against compiler
  init itself. Accepted.
- [Deterministic builds] → `gzipSync` embeds no timestamp; same input bytes
  yield same output bytes. OS byte is fixed by zlib. Accepted as sufficiently
  reproducible (same guarantee class as the rest of the Vite build).
- [`file://` support] → already explicitly unsupported (WASM subresource
  loading is blocked from disk); this change does not move that line.

## Migration Plan

Pure build + loader change, no data or user-facing migration. Deploys as a
normal redeploy; the service worker update flow (background fetch, next-load
activation) delivers it. Rollback is a revert of the commit — the raw-WASM
bundle remains a valid prior state (except on hosts with the 25 MiB cap,
which is the point of the change).

## Open Questions

None — the wasm-bindgen `Response` path, the gzip size margin, and
`DecompressionStream` availability in workers were all verified up front.
