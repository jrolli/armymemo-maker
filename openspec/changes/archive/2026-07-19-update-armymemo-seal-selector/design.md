## Context

The app vendors the armymemo Typst package as
`vendor/armymemo-0.1.0.tar.gz`, regenerated at maintenance time by
`scripts/vendor-armymemo.mjs` from a pinned upstream commit (design D3 of
add-typst-compilation: the tarball is committed; the build and runtime never
touch the network). The script currently pins
`f7b04a453fe787dcbdceaf779eb7ca12c50438f9`. Upstream's default branch has
advanced to `7479f2b7b23b566b988047db407182cb66e35a60`, whose only library
change is replacing the `memo` entry point's `logo` path parameter with a
named `seal: "DOD" | "DOW"` selector (with an assertion on invalid values)
and renaming the letterhead layout keys `logo-*` → `seal-*`. `typst.toml`
still declares version `0.1.0`, and the two seal PNGs already in the vendored
payload are unchanged.

## Goals / Non-Goals

**Goals:**

- Ship the refreshed upstream library in the vendored tarball, keeping pin,
  tarball, and starter example consistent per the README's bump procedure.
- Keep the hermetic build green: acknowledgements, precache, local-only, and
  asset-size checks all pass unchanged.

**Non-Goals:**

- No version bump: upstream stayed at `0.1.0`, so the tarball name, the
  example's `#import` line, and `licenses/manifest.json` are untouched.
- No app-code changes: nothing in the app passes `logo:` or `seal:`; the
  upstream API rename does not surface here.
- No change to the vendored file list — upstream's `Makefile` edit is outside
  the package payload (`typst.toml`, `lib.typ`, seals, `LICENSE`).

## Decisions

- **D1: Bump the pin to upstream HEAD `7479f2b`, same version.** Upstream
  publishes by advancing its default branch without tags; the vendor script's
  documented bump procedure (update `COMMIT`, rerun, keep the example import
  in sync) covers this exactly. Alternative — waiting for a tagged release —
  rejected: upstream has no tags or releases, and the current pin would
  drift indefinitely.
- **D2: Accept the upstream `logo` → `seal` API change without a compat
  shim.** The starter example relies on the default letterhead, and the app
  never forwards either parameter. Users who typed `logo:` into their own
  source get a clear Typst diagnostic from upstream's assertion, which is the
  package's own contract, not this app's. Alternative — patching the tarball
  to keep `logo` — rejected: it would fork the vendored package away from the
  pinned commit it claims to reproduce.

## Risks / Trade-offs

- [Existing user drafts that pass `logo:` stop compiling after the update] →
  The compile error is upstream's explicit assertion naming the valid `seal`
  values; drafts are user-owned Typst source, and the diagnostic panel
  already surfaces such errors. No stored-data migration exists or is needed.
- [Tarball regeneration depends on maintenance-time network fetches] →
  Unchanged property of the existing script; the regenerated tarball is
  committed, and `npm run build` stays hermetic.

## Migration Plan

Single commit: bumped script pin plus regenerated tarball. Rollback is
reverting that commit; the old tarball is byte-identical in git history.
