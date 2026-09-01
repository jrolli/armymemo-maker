## Context

All four entry methods already converge on two call sites that hold the
original source and know its format: `compileOnce` in `src/main.ts` (editor,
Typst or Markdown mode) and `convertFile` in `src/convert.ts` (dropped or
browsed `.typ`/`.md` files). Linting hooks those two sites; the compile
pipeline itself is untouched.

The engine decision is spike-verified (2026-08-31, Vale `v3` branch commit
5d33823, Go 1.25.7):

- Stock Vale fails to link for `GOOS=js GOARCH=wasm` because source-code
  linting uses tree-sitter (cgo). Moving `lintCode`/`updateQueries` (from
  `internal/lint/code.go`) and all of `internal/lint/fragment.go` behind
  `//go:build !js` tags plus a ~10-line `code_js.go` stub (delegating to the
  still-shipped regex scanner `lintCodeOld`) makes the full CLI build.
- The binary is 42.3 MB raw, 9.5 MB at `gzip -9` — under the 25 MiB
  per-file cap `scripts/check-asset-size.mjs` enforces, but only compressed,
  so it ships as `.wasm.gz` like the Typst compiler.
- It runs under `wasm_exec.js` and lints real memo text: write-good findings
  (passive voice, "utilize", "in order to", weasel words) come back as JSON
  alerts with `Line` and `Span`.
- `wasm_exec.js` must come from the same Go toolchain version that built the
  binary; a mismatched pair panics at the first filesystem call.
- Vale v3's native Typst support shells out to a `typst2vast` helper process
  and cannot work under wasm. The tested fallback is Vale's own mechanism:
  `[formats] typ = md` in `.vale.ini`.

Constraints from existing specs: no runtime network beyond own origin
(CSP + `check-local-only`), every `dist/` file precached
(`check-precache`), per-file size cap (`check-asset-size`), and every
shipped component listed on the acknowledgements page.

## Goals / Non-Goals

**Goals:**

- Real Vale — the engine and its style format, not a reimplementation — so
  the vendored style stays usable by stock Vale in CI or locally.
- Findings on every entry method, at the project's existing cadence
  (debounced auto-compile on the editor, one gesture on the conversion
  page).
- Strictly advisory: every alert Vale emits is shown; nothing about linting
  — including its total failure — blocks, delays, or alters PDF production.
- Local-only preserved structurally: the lint worker's only I/O surface is
  an in-memory filesystem seeded from same-origin assets.

**Non-Goals:**

- Inline squiggles or editor highlighting. The editor is a plain
  `<textarea>` behind the narrow `Editor` interface; findings render as a
  list. A future `highlight(ranges)` extension can build on this change
  without reworking it.
- Vale's native Typst parsing (`typst2vast`). Compiling that Rust helper to
  WASM and pre-converting is a possible follow-up, not part of this change.
- User-configurable styles, rule toggles, or suppression pragmas. One
  vendored style, always on.
- Spelling and POS-tagged rule types (need dictionaries/models not being
  vendored).

## Decisions

### D1: Patched Vale CLI compiled to wasm, vendored as an asset

Vendor `vale.wasm.gz` plus its exact-version `wasm_exec.js` under `vendor/`,
with a `PROVENANCE` file recording the upstream commit, Go toolchain
version, and the patch — following the eform vendoring pattern. A
maintenance script (network allowed, like other maintenance tooling; the
app build never fetches) reclones the pinned commit, applies the recorded
patch (`code.go` split + `code_js.go`/`fragment.go` build tags), builds
with the pinned toolchain, and compresses.

*Why not a long-lived fork repo?* The patch is two build tags and a stub —
small enough to live as a checked-in `.patch` beside the provenance record,
rebased trivially on upstream updates.

*Why the whole CLI rather than a custom `syscall/js` entrypoint?* The CLI's
`--config`/`--output=JSON`/`--no-exit` surface is exactly what's needed, is
upstream-stable, and was what the spike verified. A bespoke entrypoint
would touch `internal/` packages and deepen the fork for no functional
gain. Each lint run re-executes `main` (Go wasm programs exit); run cost at
memo scale is small, and the compiled module is cached after first
instantiation.

### D2: Dedicated lint worker with an in-memory fs shim

A new `lint-worker.ts` (worker #2, beside the compile worker) instantiates
the Go runtime and exposes one op: `lint(source, format) → Finding[]`.
Before loading `wasm_exec.js` it installs `globalThis.fs` — a small
Node-fs-shaped in-memory implementation serving a fixed tree: `/.vale.ini`,
`/styles/**` (fetched once from same-origin vendored assets), and
`/doc.md` or `/doc.typ` written per request. `process`/`path` shims come
with it. Anything outside that tree returns ENOENT.

*Why a separate worker instead of the compile worker?* Isolation both ways:
a Go runtime panic must never strand a compile in flight, and lint results
must not queue behind a slow compile. The client mirrors the existing
`compile-client.ts` RPC pattern, including respawn-on-error.

*Why the fs shim instead of embedding config/styles in the binary?* Vale
reads config and styles through `os` regardless; the shim is needed anyway
for the document, and keeping styles as plain vendored files means editing
a rule is a file edit, not a Go rebuild.

The `.wasm.gz` is inflated with the same gzip-magic-sniffing
`DecompressionStream` approach as `fetchCompilerModule` (handles dev
serving it raw and hosts that strip the encoding), extracted into a shared
helper rather than duplicated.

### D3: One vendored style — write-good base, Army-writing tuning

`vendor/vale/styles/memo/` starts from write-good's rules (MIT; enters the
acknowledgements inventory) renamed into a single `memo` style, with:
E-Prime dropped (flags every "is"/"was" — noise, and passive voice is
covered by the Passive rule); a substitution rule added for
AR 25-50-flavored plain-writing swaps ("as per" → "per", "at this time" →
"now", "in accordance with" → "per"/"under", and similar); severities left
as write-good ships them (suggestion/warning — display-only labels here).
`.vale.ini` sets `MinAlertLevel = suggestion` so every alert surfaces, and
`[formats] typ = md` with `TokenIgnores`/`BlockIgnores` patterns masking
Typst constructs (`#import`/`#show` lines, `#…(...)` calls) so markup
isn't linted as prose.

### D4: Lint as a parallel side-channel at the two choke points

At each choke point the pre-conversion source (what the user actually
typed or dropped) is sent to the lint worker concurrently with the compile;
Markdown text lints as `md`, Typst as `typ`. Findings render when they
arrive, independent of compile outcome:

- Editor page: a findings region below the diagnostics/preview area listing
  `line:col  severity  message [rule]`; hidden when empty. It updates per
  compile snapshot (same debounce, same coalescing) and is cleared/refreshed
  atomically per run — never mixed across snapshots.
- Conversion page: the same findings list rendered under the status line
  after the download outcome is reported. The download itself is triggered
  exactly as today, before lint results are considered.

Failure policy: a lint error (worker crash, wasm panic, malformed output)
renders a single quiet "prose check unavailable" note in the findings
region — never in the compile diagnostics area — and the next request
respawns the worker.

Lazy init: the lint worker spawns and fetches its ~9.5 MB module on the
first lint request, not at page load, so it never competes with the
compiler WASM fetch for first-paint bandwidth.

## Risks / Trade-offs

- [~9.5 MB added to bundle and precache — roughly doubling first-visit
  download] → Lazy worker init keeps first compile unaffected; the service
  worker precaches in the background; size is checked by the existing
  `check-asset-size` gate. Accepted cost of the "real Vale" decision.
- [Typst linted as Markdown produces false positives on markup] → Curated
  `TokenIgnores`/`BlockIgnores` in the vendored `.vale.ini`; memos exercise
  a narrow markup surface (armymemo's `#show` preamble, lists, emphasis).
  Findings are advisory, so residual noise costs attention, not
  correctness.
- [Upstream Vale drift breaks the recorded patch] → Provenance pins the
  commit; the maintenance script rebuilds reproducibly, and updates are
  deliberate maintenance acts like eform/armymemo bumps.
- [Go wasm runtime memory (tens to ~hundreds of MB) on low-end devices] →
  The runtime exits after each run, releasing its heap with the run;
  worker isolation means worst case is "prose check unavailable".
- [wasm_exec.js/toolchain version skew panics at runtime] → Both artifacts
  are produced by the same maintenance script invocation and recorded in
  PROVENANCE; a browser test asserts a lint round-trip succeeds against
  the built bundle.
- [Alert positions are relative to the linted source, which in Markdown
  mode is the Markdown (good) but for Typst includes the `#show` preamble
  lines] → Positions are reported against exactly the text the user
  entered in both modes (no linting of generated Typst), so line numbers
  always match the visible source.

## Open Questions

None blocking. Deferred by decision: inline highlighting, `typst2vast`
WASM pre-conversion, and any user-facing rule configuration.
