# Update vendored armymemo to 0.2.3

## Why

Upstream armymemo has moved from 0.2.1 (f649d1b) to 0.2.3 (17b437a). The
functional change that reaches this app: `pandoc.typ` now passes an optional
`seal` front-matter field through to `memo.with(...)`, so Markdown memos can
select the DOW letterhead seal — previously only Typst-mode memos could. The
pending `add-markdown-seal-field` change proposed adding exactly this to the
converter as a documented divergence from upstream; upstream has since done
it natively, so that change is superseded and folded in here: `seal` support
becomes part of mirroring `pandoc.typ`, not a divergence from it. The other
upstream commit (0.2.2) teaches `pandoc.sh` to stamp eform fields when the
`eform` CLI is on PATH — a CLI-workflow feature with no web-app counterpart
(the app already stamps fields via the eform WASM module).

## What Changes

- Re-vendor the package tarball at 17b437a as `vendor/armymemo-0.2.3.tar.gz`
  (replacing `armymemo-0.2.1.tar.gz`); the payload file list is unchanged
  and the only payload diffs are the version in `typst.toml` and a version
  comment in `lib.typ`.
- Bump `scripts/vendor-armymemo.mjs` COMMIT/VERSION pins.
- Move every version pin together: the starter example's `#import`
  (`src/assets/example.typ`), `ARMYMEMO_VERSION` in
  `src/armymemo-version.ts`, the tarball references in
  `src/typst-service.ts`, `licenses/manifest.json`, regenerated
  `acknowledgements.html`, README references, and the Markdown-conversion
  golden fixtures (which embed the emitted `#import` line).
- Markdown converter: accept optional top-level `seal` front matter and emit
  it as `seal: "<value>"`, mirroring upstream `pandoc.typ`'s new
  `$if(seal)$` clause. Absent means not emitted, so armymemo's default
  (`"DOD"`) applies; the value stays unvalidated by the converter because
  armymemo's own assertion names the accepted seals.
- Refresh the vendored `pandoc-example.md` fixture's PROVENANCE pin to
  17b437a (upstream's example file itself is unchanged) and extend the
  `full-metadata` fixture to exercise `seal`.
- Remove the superseded `add-markdown-seal-field` change (proposal-only, no
  implementation had started).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `typst-compilation`: the vendored package spec the compiler must resolve
  becomes `@local/armymemo:0.2.3` / `@preview/armymemo:0.2.3` (version pin
  only; resolution behavior is unchanged).
- `markdown-conversion`: the front-matter mapping requirement gains optional
  `seal`, passed through to `memo.with(...)` — still mirroring upstream
  `pandoc.typ` exactly, which now includes the clause.

## Impact

- `vendor/armymemo-0.2.1.tar.gz` → `vendor/armymemo-0.2.3.tar.gz`,
  `scripts/vendor-armymemo.mjs`.
- `src/assets/example.typ`, `src/armymemo-version.ts`, `src/typst-service.ts`,
  `src/markdown/memo-arguments.ts`.
- `tests/markdown-conversion/` fixtures: golden `#import` lines,
  `pandoc-example.PROVENANCE`, `full-metadata` pair gains `seal`.
- `licenses/manifest.json`, `acknowledgements.html`, `README.md`,
  `openspec/specs/typst-compilation/spec.md` (version pin) and
  `openspec/specs/markdown-conversion/spec.md` (seal mapping) via deltas.
- `openspec/changes/add-markdown-seal-field/` removed as superseded.
- No runtime-network or backend impact; all new bytes are vendored.
