## Why

`npm run dev` cannot compile the starter example: Vite's dev server serves the vendored `/vendor/armymemo-0.1.0.tar.gz` with `Content-Encoding: gzip` (inferred from the `.gz` extension), so the browser transparently inflates the body and the app's fetch receives a raw tar — while typst.ts's package loader requires the gzipped bytes. Compilation fails with `failed to load package ... invalid gzip header`. Production is unaffected today, but any host that applies the same header inference would break it there too. This is non-conformance with the existing `typst-compilation` requirement that the starter example compiles through the vendored package.

## What Changes

- The tarball loader in `src/typst-service.ts` sniffs the fetched bytes for the gzip magic number (`0x1f 0x8b`, the same check the compiler-WASM loader already does): gzipped bytes pass through unchanged; bytes whose gzip layer was stripped in transit are re-gzipped in the browser via `CompressionStream("gzip")` before being handed to typst.ts.
- No Vite/dev-server configuration changes: fixing it in the loader is host-agnostic (dev server today, a header-mangling static host tomorrow), consistent with the compiler-WASM loader's design in `compress-compiler-wasm` (D4).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `typst-compilation`: extend the "Offline armymemo package resolution" requirement to state that vendored package resolution succeeds regardless of whether the delivery path preserves or strips the archive's compression layer, with a scenario covering the dev server.

## Impact

- `src/typst-service.ts` — tarball fetch in `initOnce()` gains the sniff-and-restore step (~10 lines; reuses the existing gzip magic constants).
- No new dependencies; `CompressionStream` has the same browser baseline as the already-required `DecompressionStream`.
- Re-gzipping only ever runs on stripped delivery paths and costs ~milliseconds for the ~190 KB archive.
