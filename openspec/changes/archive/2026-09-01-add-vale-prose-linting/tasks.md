## 1. Vendor the Vale engine

- [x] 1.1 Write `scripts/vendor-vale.sh` (maintenance-time, network allowed): clone the pinned Vale commit, apply the checked-in js/wasm patch, build with the pinned Go toolchain (`GOOS=js GOARCH=wasm`, `-trimpath -ldflags="-s -w"`), `gzip -9` the binary, and copy the toolchain's matching `wasm_exec.js`
- [x] 1.2 Check in the patch file (build-tag split of `internal/lint/code.go` into `code_treesitter.go` + `code_js.go` stub, `//go:build !js` on `internal/lint/fragment.go`) beside the script
- [x] 1.3 Run the script; commit `vendor/vale/vale.wasm.gz`, `vendor/vale/wasm_exec.js`, and `vendor/vale/PROVENANCE` (upstream commit, Go version, patch reference, build command)
- [x] 1.4 Verify the artifact under Node with the same-toolchain `wasm_exec_node.js`: `--version` runs and a sample lint returns JSON alerts

## 2. Vendor the style and configuration

- [x] 2.1 Create the single `memo` style under `vendor/vale/styles/memo/` from write-good's rules: keep Passive, TooWordy, Weasel, and the other prose rules; drop E-Prime; add an AR 25-50 plain-writing substitution rule ("as per" → "per", "at this time" → "now", "in accordance with" → "per", and similar)
- [x] 2.2 Create `vendor/vale/vale.ini` with `StylesPath`, `MinAlertLevel = suggestion`, `[formats] typ = md`, and `[*.{md,typ}] BasedOnStyles = memo` plus `TokenIgnores`/`BlockIgnores` masking Typst markup (`#import` lines, `#show: … .with(...)` blocks, code-mode calls)
- [x] 2.3 Verify with the Node runner against fixture memos: a passive/wordy Markdown body yields findings at correct lines; the armymemo Typst example's preamble yields no markup findings while planted body issues are found; "The suspense date is …" yields nothing

## 3. Lint worker and client

- [x] 3.1 Extract the gzip-sniffing `DecompressionStream` fetch from `typst-service.ts` into a shared helper used by both the compiler fetch and the Vale fetch
- [x] 3.2 Write the in-memory fs shim (Node-fs-shaped `globalThis.fs` plus `process`/`path` globals) serving `/vale.ini`, `/styles/**`, and the per-request document; ENOENT elsewhere
- [x] 3.3 Write `src/lint-worker.ts`: seed the shim from the vendored assets on first request, instantiate `vale.wasm` per lint with argv `--config=/vale.ini --output=JSON --no-exit /doc.{md,typ}`, capture stdout, parse alerts into `{line, span, severity, message, rule}` findings
- [x] 3.4 Write `src/lint-client.ts` mirroring `compile-client.ts` (lazy spawn, pending map, reject-all-and-respawn on worker error) exposing `lintProse(source, format): Promise<Finding[]>`
- [x] 3.5 Unit-test worker parsing and the fs shim (alert JSON → findings; unknown path → ENOENT; malformed output → rejection)

## 4. Editor page integration

- [x] 4.1 Add the findings region to `index.html` and `style.css`, distinct from `#diagnostics` and `#field-status`, hidden by default
- [x] 4.2 In `compileOnce`, dispatch `lintProse` on the pre-conversion snapshot (Markdown text in Markdown mode, Typst text in Typst mode) concurrently with the compile; render findings atomically per snapshot, hide the region when empty, and never touch preview/download/diagnostics state from the lint path
- [x] 4.3 Render lint failure as a single "prose check unavailable" note in the findings region; confirm the next snapshot retries afresh

## 5. Conversion page integration

- [x] 5.1 Add the findings region to `convert.html`
- [x] 5.2 In `convertFile`, lint the file's original text (format by extension) without gating the compile-and-download flow; render findings under the outcome status once available, including when conversion or compilation failed

## 6. Bundle, inventory, and verification

- [x] 6.1 Wire the vendored Vale assets through the Vite build so they ship in `dist/` and pass `check:local-only`, `check:precache` (service-worker precache picks them up), and `check:asset-size`
- [x] 6.2 Add Vale (Apache-2.0), its compiled-in Go modules, and write-good's style license (MIT) to the acknowledgements inventory; update `check-acknowledgements`/generation tooling as needed until `npm run build` passes
- [x] 6.3 Browser verification: on the editor page, a memo with planted prose issues compiles, previews, downloads, and lists findings in both modes; a clean memo hides the region; on the conversion page a dropped `.typ` with issues downloads its PDF and then shows findings
- [x] 6.4 Browser verification of degradation: with the lint worker forced to fail, compile/preview/download behave exactly as today and the findings region shows the unavailable note
- [x] 6.5 Update `README.md` (prose linting section: what it checks, advisory-only, local-only) and run the full `npm run build`
