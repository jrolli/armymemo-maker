# Design: add-typst-compilation

## Context

The shell (archived `setup-webapp-shell`) delivers an editor, a placeholder output pane, and disabled Compile/Download actions, under a hard local-only contract (CSP `default-src 'self'` + `check:local-only` build scan). This change makes Compile real: user Typst source → PDF bytes, entirely in-browser.

Research findings this design rests on (verified against installed typings/source of typst.ts 0.7.0):

- `@myriaddreamin/typst.ts` 0.7.0 snippet API provides `$typst.pdf({mainContent, inputs}) → Uint8Array` and `$typst.query({selector, field, ...})` (query needed by the next change — this wrapper satisfies both).
- Compiler WASM ships in `@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm` (~28 MB) and its URL is configurable via `setCompilerInitOptions({getModule})` — vendorable same-origin.
- Package resolution is pluggable: `TypstSnippet.fetchPackageBy(accessModel, fetcher)` lets a sync fetcher return a package's **tar.gz bytes**, which typst.ts untars into an in-memory FS at `/@memory/fetch/packages/preview/<name>/<version>`. Fully offline `@preview` resolution.
- Fonts are pluggable: `TypstSnippet.disableDefaultFontAssets()` stops the default GitHub font fetch (which would violate the CSP); `$typst.addFonts(...)` loads vendored fonts.
- armymemo reads `sys.inputs.font` (default `"Arial"`), so the compiled font is selectable per compile via `inputs: {font: ...}` without touching user source.
- armymemo's package payload is `typst.toml`, `lib.typ`, `DOD_Seal_BW.png`, `DOW_Seal_BW.png` (the letterhead seals must ship in the tarball), plus LICENSE/README. The repo has no release tags; vendoring pins a commit SHA.

## Goals / Non-Goals

**Goals:**

- Compile button: current editor source → PDF bytes in memory, with `@preview/armymemo:0.1.0` resolving offline.
- PDF preview in the output pane; Download saves the compiled PDF.
- Compile errors/warnings surfaced legibly in the output pane with source locations where available.
- Local-only contract intact: WASM, fonts, and the armymemo package all served from own origin; CSP extended only by `'wasm-unsafe-eval'`.

**Non-Goals:**

- `<esign-field>` extraction and esign integration (next two changes) — but the wrapper choice already provides `query`, so nothing here needs rework.
- Auto-compile on typing / debounce; compilation is manual via the button this change.
- Arbitrary Typst Universe package support: only vendored packages resolve; anything else fails with a clear diagnostic. This is a feature of the local-only contract, not a limitation to fix.
- Print-perfect Arial fidelity (see D4).

## Decisions

### D1: typst.ts 0.7.0 (snippet API) as the compiler wrapper

Pinned exact (`0.7.0`, no caret). It is the only maintained browser wrapper that provides PDF export **and** document query, plus pluggable fonts/packages — every capability the remaining three changes need, verified in its shipped typings rather than docs.

- *Alternative — hand-built wasm-bindgen wrapper over the typst crates:* maximal control (exact Typst version, minimal exports) but a large Rust build/maintenance burden, and it duplicates what typst.ts already does. Revisit only if typst.ts's Typst version falls behind what armymemo requires.
- *Alternative — local native server shelling to `typst` CLI:* violates the no-backend architecture; rejected.

### D2: PDF preview via `<iframe>` + blob URL; no typst-ts-renderer

The output pane gets an `<iframe>` whose `src` is a `URL.createObjectURL` blob of the compiled PDF — the browser's built-in PDF viewer does the rendering. This drops the `@myriaddreamin/typst-ts-renderer` dependency entirely (smaller bundle, one less WASM module) and guarantees preview-equals-download.

- *Alternative — SVG preview via the typst.ts renderer:* crisper embedding and viewer-independent, but adds a second WASM module and a preview pipeline that can drift from the downloaded PDF. Deferred unless iframe PDF viewing proves inadequate.
- Blob URLs are revoked on replacement to avoid leaking the previous compile's memory.

### D3: armymemo vendored as a committed tar.gz + custom package fetcher

`vendor/armymemo-0.1.0.tar.gz` is committed to the repo (built by `scripts/vendor-armymemo.mjs`, which downloads the package files from a pinned commit SHA of jrolli/armymemo and tars them — network at *maintenance* time only, never at build or runtime). The app imports the tarball as a Vite asset URL, fetches it same-origin during compiler init, and registers a `fetchPackageBy` fetcher that returns those bytes for spec `preview/armymemo/0.1.0` and `undefined` otherwise (yielding a normal "package not found" diagnostic for anything non-vendored).

- *Alternative — inline the package files via `mapShadow` under the package path:* relies on typst.ts's internal mount layout staying stable; the registry hook is the supported surface. Rejected.
- *Alternative — regenerate the tarball at every build:* makes builds network-dependent, contradicting the reproducibility stance from the shell change. Rejected.

### D4: Fonts — vendored Liberation Sans, default assets disabled, `inputs.font` pinned

`TypstSnippet.disableDefaultFontAssets()` (the default behavior fetches fonts from GitHub at runtime — a CSP violation and local-only breach), plus `$typst.addFonts` of four vendored Liberation Sans faces (regular/bold/italic/bold-italic, SIL OFL). Every compile passes `inputs: {font: "Liberation Sans"}`, using armymemo's own font input rather than rewriting user source. Liberation Sans is metric-compatible with Arial (armymemo's default), so layout and the later signature-field coordinates match Arial output.

- *Alternative — ship Arial:* not redistributable. *Alternative — keep default font assets:* runtime GitHub fetch, rejected outright.
- Trade-off: source using glyphs outside Liberation coverage (or explicitly requesting other fonts) falls back or warns; acceptable for AR 25-50 memoranda.

### D5: Compilation on the main thread with a busy state

`$typst.pdf` runs on the main thread; the Compile button shows a busy/disabled state during compilation. Memos are small documents; blocking for the compile duration is acceptable and keeps this change free of worker plumbing.

- *Alternative — Web Worker:* right call if compiles grow long (large docs, auto-compile), but it complicates asset init and error plumbing now. Deferred; the service module's async API (`compile(source) → result`) already matches a future worker seam.

### D6: CSP gains `'unsafe-eval'` (revised during implementation) and `frame-src blob:`

Planned as `'wasm-unsafe-eval'` only, but implementation surfaced (via `securitypolicyviolation` events) that the compiler WASM's `js_sys::global()` fallback evaluates `Function("return this")` at startup — so the bundle factually requires `'unsafe-eval'` (which also covers WASM compilation). Script *sources* remain `'self'`; the no-external-origins contract is unaffected. `frame-src 'self' blob:` is added for the D2 preview iframe. Revisit narrowing to `'wasm-unsafe-eval'` when a future typst.ts/js-sys stops invoking the eval fallback. `check:local-only` continues to guard the bundle unchanged, with the vendored bundle's dead-code CDN/registry URL strings explicitly allowlisted (the live guards are the CSP and the verification suite's network assertions).

### D7: Compile pipeline result shape

The service module returns `{ok: true, pdf: Uint8Array} | {ok: false, diagnostics: string}` (diagnostics as rendered text from the compiler's error output, including source line references where Typst provides them). The UI renders diagnostics into the output pane, replacing any previous preview. This shape gains `fieldManifest` in the next change without breaking callers.

## Risks / Trade-offs

- [28 MB WASM asset makes first load heavy] → Compiler initializes lazily on first Compile (not page load), with visible progress state; asset is same-origin and cacheable. Documented as inherent to local-only compilation.
- [typst.ts 0.7.0's bundled Typst version might reject armymemo's `lib.typ`] → Verified end-to-end in this change's Playwright test compiling the real starter example through the real vendored package; failure here blocks the change rather than surfacing later.
- [Browser PDF viewer differences in the preview iframe] → Preview is convenience; Download is the product. All modern desktop browsers ship a PDF viewer. Revisit with D2's SVG alternative if real complaints emerge.
- [Liberation-for-Arial substitution changes metrics vs. a native-Arial system] → Liberation Sans is metric-compatible by design; signature-field coordinates come from the same compile that produced the PDF, so internal consistency holds regardless.
- [Vendored tarball drifts from upstream armymemo] → Pinned commit SHA recorded in the vendor script; regeneration is an explicit, reviewable act.

## Migration Plan

Additive change to a static site: deploy the new `dist/`, rollback by redeploying the previous one. The vendored tarball, fonts, and WASM all version with the bundle — no cross-version state.

## Open Questions

- **Download filename**: fixed `memo.pdf` this change; deriving it from the memo's subject line becomes trivial once the query pipeline exists (next change) if wanted.
- **Compile keyboard shortcut / auto-compile**: UX sugar deferred until the full pipeline (through esign) is in place.
