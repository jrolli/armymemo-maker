## Context

We vendor esign WASM artifacts (`vendor/esign/`) built from pinned commit
`20de923` by `scripts/vendor-esign.sh`. Upstream has added exactly one commit,
`d777d66` ("License under AGPL-3.0-or-later"), which adds a LICENSE file and
changes no code. The vendor script already tries to copy `LICENSE` from the
upstream checkout (`cp ... || true`), so re-vendoring at the new commit picks
it up automatically. The project itself currently declares no license.

## Goals / Non-Goals

**Goals:**
- Track upstream esign at the newly licensed commit.
- Distribute the upstream AGPL license text with the vendored artifacts.
- License this project under AGPL-3.0-or-later (root `LICENSE`,
  `package.json` `license` field, README documentation).

**Non-Goals:**
- No per-file copyright headers (AGPL does not require them; the repo has no
  such convention).
- No CI license auditing of other dependencies.
- No behavioral or code changes to the app.

## Decisions

- **D1: License the whole project AGPL-3.0-or-later** rather than isolating
  esign behind a license boundary. The app links the esign WASM into one
  distributed work served to users, so the practical alternatives are AGPL or
  removing esign; matching upstream's "or-later" grant keeps maximum
  compatibility.
- **D2: Re-vendor with the existing script** (bump `COMMIT`, rerun) rather
  than hand-copying the LICENSE file. This keeps `PROVENANCE` truthful and
  exercises the established maintenance path. wasm-bindgen stays at 0.2.126
  per upstream's unchanged Cargo.lock, so the installed toolchain works.
- **D3: SPDX id `AGPL-3.0-or-later` in `package.json`**, with the canonical
  GNU AGPL v3 text in the root `LICENSE`. This is the standard npm/SPDX
  representation of "version 3 or any later version".

## Risks / Trade-offs

- [Rebuilt WASM byte-diff] Rebuilding at `d777d66` may produce a
  byte-different `esign_bg.wasm` despite identical source (toolchain
  nondeterminism) → acceptable; PROVENANCE records the commit and
  wasm-bindgen version, and the source tree is code-identical to what is
  already shipped.
- [AGPL network clause] Serving the app is "conveying" over a network; users
  must be able to get the source → the README already links the public GitHub
  repos for this project and esign, which satisfies the source-offer in
  practice.
