# Update vendored armymemo to 0.2.1

## Why

Upstream armymemo has moved from 0.1.0 (3388e8f) to 0.2.1 (f649d1b) with
several formatting fixes and features: closing blocks keep with the tail of
the last paragraph, bare Encl/Encls counts and "CF: (w/o encls)" support,
SEE DISTRIBUTION memos with paginated listings, tuned closing rhythm /
enclosure runover / one-paragraph memos, and concurrence boxes centered in
the margin without overlap. The app pins the old version everywhere — the
vendored tarball, the starter example's `#import`, the compiler's package
fetcher, and the notice inventory — so users cannot get the fixes until
every pin moves together.

## What Changes

- Re-vendor the package tarball at f649d1b as `vendor/armymemo-0.2.1.tar.gz`
  (replacing `armymemo-0.1.0.tar.gz`); the payload file list is unchanged
  (lib.typ, typst.toml, seals, LICENSE, vendored eform typst subtree).
- Bump `scripts/vendor-armymemo.mjs` COMMIT/VERSION pins.
- Starter example (`src/assets/example.typ`) imports
  `@preview/armymemo:0.2.1`; `src/typst-service.ts` resolves that spec from
  the renamed tarball.
- Update `licenses/manifest.json` (armymemo 0.2.1) and regenerate
  `acknowledgements.html`; README version references follow.
- No API or field-metadata changes: armymemo still emits `<eform-field>`
  metadata and the vendored eform typst helpers are byte-identical between
  the two commits.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `typst-compilation`: the vendored package spec the compiler must resolve
  becomes `@preview/armymemo:0.2.1` (version pin only; resolution behavior
  is unchanged).

## Impact

- `vendor/armymemo-0.1.0.tar.gz` → `vendor/armymemo-0.2.1.tar.gz`,
  `scripts/vendor-armymemo.mjs`.
- `src/assets/example.typ`, `src/typst-service.ts`.
- `licenses/manifest.json`, `acknowledgements.html`, `README.md`.
- Footer "Updated" date needs no manual edit — it is injected from the HEAD
  committer date at build time.
- No runtime-network or backend impact; all new bytes are vendored.
