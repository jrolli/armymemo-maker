## Why

Upstream esign (github.com/jrolli/esign) is now licensed under AGPL-3.0-or-later
(commit `d777d66`, one commit past our pinned `20de923`, adding only the LICENSE
file — no code changes). We vendor and distribute esign-derived WASM artifacts,
so this project must comply: carry the upstream license text with the vendored
artifacts and license the project itself under a compatible license. Adopting
AGPL-3.0-or-later for the whole project is the simplest compliant choice.

## What Changes

- Bump the pinned esign commit in `scripts/vendor-esign.sh` to
  `d777d66202dc1aac29e2aaae6eb8535aab0e649c` and re-vendor `vendor/esign/`,
  which now includes `vendor/esign/LICENSE` (AGPL-3.0-or-later).
- Add a root `LICENSE` file containing the GNU AGPL v3 text, licensing this
  project as AGPL-3.0-or-later.
- Set `"license": "AGPL-3.0-or-later"` in `package.json`.
- Document the project license and the esign license in `README.md`.

## Capabilities

### New Capabilities

(none — this is a dependency bump plus licensing; no new app behavior)

### Modified Capabilities

- `signable-pdf`: the vendored-artifact requirement gains a clause that the
  upstream license text SHALL be vendored alongside the built artifacts and
  kept in sync by the maintenance script.

## Impact

- `scripts/vendor-esign.sh` — pinned COMMIT bump.
- `vendor/esign/` — regenerated artifacts, new `LICENSE`, updated `PROVENANCE`.
- `LICENSE`, `package.json`, `README.md` — project relicensed AGPL-3.0-or-later.
- No runtime or API changes; the rebuilt WASM comes from an identical source
  tree except for the added license file.
