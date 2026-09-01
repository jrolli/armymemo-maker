## Why

The app compiles memos but says nothing about the prose in them, while Army
writing has explicit standards (AR 25-50: active voice, concise wording) that
authors routinely miss. A feasibility spike proved the real Vale linter builds
for `js/wasm` with a two-file patch, runs under the wasm runtime, and lints
both Markdown and Typst sources end-to-end at ~9.5 MB gzipped — within the
25 MiB static-host per-file cap the build already enforces — so the full Vale
engine and style format can run inside the existing local-only contract.

## What Changes

- Vendor a patched Vale build (`vale.wasm.gz` + its version-paired
  `wasm_exec.js`) as a new same-origin static asset, produced by maintenance
  tooling the same way other vendored WASM is.
- Add a prose-lint service: a dedicated Web Worker hosting the Go/WASM
  runtime behind an in-memory filesystem shim that serves exactly the Vale
  config, the vendored style, and the document being linted — no other I/O
  path exists.
- Vendor one general-purpose prose style based on write-good (MIT), tuned
  toward Army writing where they differ (drop the noisy E-Prime rule, add
  AR 25-50-flavored wordiness substitutions).
- Lint on every entry method by hooking the two existing choke points:
  the editor's compile snapshot (Typst and Markdown modes) and the
  conversion page's file intake (`.typ` and `.md`/`.markdown` files).
  Typst sources lint via Vale's `[formats] typ = md` association with
  token-ignore patterns for Typst markup (Vale's native Typst path needs a
  subprocess and cannot run under wasm).
- Surface findings as advisory warnings: a findings list beside the output
  on the editor page, and in the status area alongside the completed
  download on the conversion page. Every finding Vale reports is shown;
  no finding, lint failure, or lint crash ever blocks or delays PDF
  production.
- Extend the acknowledgements inventory with Vale, its compiled-in Go
  modules, and the write-good style (existing requirements already demand
  this for any shipped component; no spec change needed there).

## Capabilities

### New Capabilities

- `prose-linting`: linting memo prose with the Vale engine in-browser —
  the vendored engine and style, format handling for Typst and Markdown
  sources, the advisory (never-blocking) severity policy, and the
  local-only execution contract.

### Modified Capabilities

- `memo-editor`: the editor page gains a prose-warnings display fed by the
  same debounced compile cadence, present in both source modes, and
  independent of compile success/failure display.
- `file-compile-page`: the conversion page reports prose findings for the
  dropped file alongside the download outcome without changing the
  one-gesture compile-and-download behavior.

## Impact

- New: lint worker + client module in `src/`, vendored `vale.wasm.gz`,
  `wasm_exec.js`, Vale config, and style files under `vendor/`; maintenance
  script to rebuild the patched Vale WASM from a pinned upstream commit plus
  the recorded patch.
- Modified: `src/main.ts` and `src/convert.ts` (lint dispatch + findings
  display), `index.html`/`convert.html` (findings area), `style.css`,
  service-worker precache manifest (generated; ~9.5 MB added to first-visit
  download), acknowledgements inventory.
- Unchanged: the compile pipeline (`compile-worker`, `typst-service`,
  `eform-service`) — linting is a parallel side-channel; a hard cap stays
  enforced by the existing `check-asset-size`/`check-local-only` build
  checks, which the new assets must pass.
