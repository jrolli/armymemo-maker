#!/usr/bin/env bash
# Regenerate vendor/eform/ (eform.js + eform_bg.wasm + typings) from a pinned
# commit of github.com/jrolli/eform. Network and Rust toolchain are used here,
# at maintenance time only — never at app build or runtime (design D1).
#
# Requires: git, cargo with the wasm32-unknown-unknown target, and
# wasm-bindgen-cli matching the wasm-bindgen version in eform's Cargo.lock
# (NOT the Cargo.toml minimum — cargo resolves upward):
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-bindgen-cli --version 0.2.126 --locked
#
# When bumping: update COMMIT (and the wasm-bindgen-cli version if eform's
# Cargo.lock changed), rerun, and commit the vendor/eform/ diff plus the
# refreshed licenses/eform-crates.json; then rerun
# `node scripts/generate-acknowledgements.mjs` and commit the regenerated
# acknowledgements.html (check-acknowledgements.mjs enforces all of this).
set -euo pipefail

COMMIT="a7db0d43e66e0162cf0b5ffd5ae05140133b0fc6"

root="$(cd "$(dirname "$0")/.." && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

git clone --quiet https://github.com/jrolli/eform.git "$stage/eform"
git -C "$stage/eform" checkout --quiet "$COMMIT"

# --lib is essential: the bin target also emits eform.wasm on wasm32 and
# would clobber the cdylib with a clap main() that exits at init.
(cd "$stage/eform" && cargo build --quiet --release --target wasm32-unknown-unknown --features wasm --lib)

rm -rf "$root/vendor/eform"
wasm-bindgen --target web --out-dir "$root/vendor/eform" \
  "$stage/eform/target/wasm32-unknown-unknown/release/eform.wasm"

cp "$stage/eform/LICENSE" "$root/vendor/eform/LICENSE" 2>/dev/null || true

# Emit the crate-level license inventory for the acknowledgements page from
# the very checkout that produced the WASM, so binary and notices can never
# come from different commits (design D2 of add-acknowledgements-page).
node "$root/scripts/emit-crate-inventory.mjs" \
  --manifest-path "$stage/eform/Cargo.toml" --package eform --features wasm \
  --out "$root/licenses/eform-crates.json"
{
  echo "Built from https://github.com/jrolli/eform at commit $COMMIT"
  echo "by scripts/vendor-eform.sh ($(wasm-bindgen --version))."
} > "$root/vendor/eform/PROVENANCE"

ls -la "$root/vendor/eform/"
echo "vendored eform at $COMMIT"
