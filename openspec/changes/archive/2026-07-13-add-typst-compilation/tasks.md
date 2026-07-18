# Tasks: add-typst-compilation

## 1. Vendoring

- [x] 1.1 Write `scripts/vendor-armymemo.mjs`: download armymemo package files (typst.toml, lib.typ, seal PNGs, LICENSE) at a pinned commit SHA and produce `vendor/armymemo-0.1.0.tar.gz`; run it and commit the tarball
- [x] 1.2 Vendor Liberation Sans (regular/bold/italic/bold-italic TTFs + license) into `src/assets/fonts/`
- [x] 1.3 Add `@myriaddreamin/typst.ts` and `@myriaddreamin/typst-ts-web-compiler` pinned at 0.7.0; remove the unused renderer package if present

## 2. Compiler service

- [x] 2.1 Implement `src/typst-service.ts`: lazy one-time init configuring the same-origin compiler WASM URL, disabled default font assets, vendored fonts, and the armymemo package fetcher (tar.gz bytes for `preview/armymemo/0.1.0`, undefined otherwise)
- [x] 2.2 Implement `compile(source) → {ok, pdf} | {ok: false, diagnostics}` passing `inputs: {font: "Liberation Sans"}`, with diagnostics text captured from compiler errors

## 3. UI wiring

- [x] 3.1 Enable Compile: busy/disabled state while compiling (including during first-compile WASM init, with a loading indication), re-enabled after
- [x] 3.2 Render failure diagnostics into the output pane, replacing any previous preview; clear them on the next successful compile
- [x] 3.3 Render successful output as a PDF preview via `<iframe>` + blob URL, revoking the prior blob URL on replacement
- [x] 3.4 Enable Download after a successful compile; it saves the latest PDF bytes as `memo.pdf`

## 4. Local-only contract

- [x] 4.1 Extend the production CSP with `'wasm-unsafe-eval'` in `script-src` (the pre-announced edit) and confirm `npm run build` (including `check:local-only`) passes with the WASM/font/tarball assets in `dist/`

## 5. Verification

- [x] 5.1 Playwright end-to-end against the served production bundle: compile the starter example through the real vendored package; assert preview iframe gets a blob URL, Download yields bytes starting `%PDF`, and every network request is same-origin
- [x] 5.2 Verify failure path: source with a syntax error shows located diagnostics and no stale preview; fixing and recompiling recovers
- [x] 5.3 Verify non-vendored package import fails with a diagnostic naming the package, and no external package-registry request occurs
- [x] 5.4 Confirm all remaining spec scenarios: busy state, Download disabled before first success, preview replacement with blob revocation, no CSP violations in console
