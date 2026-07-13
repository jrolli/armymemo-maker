# Tasks: compress-compiler-wasm

## 1. Build-time compression (design D3)

- [x] 1.1 Add a `compressCompilerWasm` plugin to `vite.config.ts` (build-only, alongside `injectProductionCsp`): in `generateBundle`, find the single asset matching `typst_ts_web_compiler_bg-*.wasm`, gzip it with `node:zlib` `gzipSync(source, { level: 9 })`, emit it under the same name with `.wasm` → `.wasm.gz`, and delete the original asset from the bundle
- [x] 1.2 In the same hook, rewrite every occurrence of the old filename in emitted JS chunks to the new `.wasm.gz` name; throw (failing the build) if the matched assets ≠ 1 or the number of rewritten chunks is 0
- [x] 1.3 Run `npm run build` and confirm: `dist/` contains the `.wasm.gz` (~11 MiB) and no raw compiler `.wasm`, and the referencing chunk points at the new name

## 2. Runtime decompression (design D4)

- [x] 2.1 In `src/typst-service.ts`, replace `getModule: () => compilerWasmUrl` with an async loader: fetch `compilerWasmUrl`, sniff the first two body bytes for the gzip magic number (`0x1f 0x8b`), re-prepend the read chunk to the remaining stream, pipe through `DecompressionStream("gzip")` only when the magic matched, and return a `Response` with `Content-Type: application/wasm`
- [x] 2.2 Confirm dev mode still works: `npm run dev`, compile the starter example (loader must pass the raw `node_modules` WASM through unmodified)
- [x] 2.3 Confirm production works: `npm run build && npm run preview`, compile the starter example and download the signable PDF, with the network tab showing the `.wasm.gz` fetched same-origin

## 3. Build gate for file size (design D5, local-delivery delta)

- [x] 3.1 Add `scripts/check-asset-size.mjs` in the style of `check-local-only.mjs`: walk `dist/` recursively, collect every file ≥ 26,214,400 bytes, and exit non-zero listing each offending file with its size; print an OK line otherwise
- [x] 3.2 Wire it in as `"check:asset-size"` in `package.json` and append `&& npm run check:asset-size` to the `build` script; verify `npm run build` passes and that temporarily lowering the limit makes it fail naming the file
- [x] 3.3 Verify the existing checks still cover the renamed asset: `check:local-only` passes on the `.gz` binary and `check:precache` shows `.wasm.gz` in the generated `sw.js` precache list with no raw compiler `.wasm` entry

## 4. Offline and end-to-end verification

- [x] 4.1 Serve the production bundle over localhost, let the service worker finish precaching, go fully offline, reload, and confirm compile + signable-PDF download still succeed (compressed asset served from the precache)
- [x] 4.2 Run the browser verification suite(s) against the production bundle to confirm no behavioral regressions from the loader change

## 5. Documentation

- [x] 5.1 Update `README.md`: in Vendored assets, note the compiler WASM ships gzipped (~11 MiB in `dist/`, inflated in-browser via `DecompressionStream`) to stay under static-host 25 MiB per-file caps; mention `check:asset-size` beside the other build checks
