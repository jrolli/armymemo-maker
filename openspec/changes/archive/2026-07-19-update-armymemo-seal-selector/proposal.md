## Why

Upstream armymemo published new commits on its default branch (latest:
`7479f2b7b23b566b988047db407182cb66e35a60`, 2026-07-19). The app vendors the
package as a tarball regenerated from a pinned commit, currently
`f7b04a453fe787dcbdceaf779eb7ca12c50438f9`; refreshing the pin keeps the
shipped template current with upstream fixes and API cleanup.

## What Changes

- Bump the pinned `COMMIT` in `scripts/vendor-armymemo.mjs` to
  `7479f2b7b23b566b988047db407182cb66e35a60` and regenerate
  `vendor/armymemo-0.1.0.tar.gz` from it.
- Upstream's only library change between the pins: the `memo` entry point's
  `logo` path parameter is replaced by a named `seal: "DOD" | "DOW"` selector
  (invalid values fail with a clear assertion), and the letterhead layout keys
  `logo-dx`/`logo-dy`/`logo-height` are renamed to `seal-*`. **BREAKING** for
  user documents that passed `logo:` explicitly; the default letterhead is
  unchanged. The starter example uses neither parameter and needs no edit.
- Package version in upstream `typst.toml` remains `0.1.0`, so the tarball
  filename, the starter example's `#import "@preview/armymemo:0.1.0"` line,
  and the `armymemo` version recorded in `licenses/manifest.json` all stay
  as-is.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `typst-compilation`: no existing requirement changes (resolution,
  starter-example, and acknowledgements requirements are all stated against
  the vendored tarball and the `0.1.0` version, which stay the same). This
  change ADDs a provenance requirement — the vendored armymemo archive is
  regenerated from a pinned upstream commit by a maintenance script, mirroring
  the existing "Vendored esign module" requirement in `signable-pdf` — making
  the vendoring contract this bump exercises explicit.

## Impact

- `scripts/vendor-armymemo.mjs` — pinned commit constant.
- `vendor/armymemo-0.1.0.tar.gz` — regenerated payload (same filename).
- No app source, spec, or manifest changes. `npm run build` (including
  `check:acknowledgements` and `check:precache`) must still pass, and the
  starter example must still compile against the refreshed tarball.
