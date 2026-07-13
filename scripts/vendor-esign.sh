#!/usr/bin/env bash
# Regenerate vendor/esign/ (esign.js + esign_bg.wasm + typings) from a pinned
# commit of github.com/jrolli/esign. Network and Rust toolchain are used here,
# at maintenance time only — never at app build or runtime (design D1).
#
# Requires: git, cargo with the wasm32-unknown-unknown target, and
# wasm-bindgen-cli matching the wasm-bindgen version in esign's Cargo.lock
# (NOT the Cargo.toml minimum — cargo resolves upward):
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-bindgen-cli --version 0.2.126 --locked
#
# When bumping: update COMMIT (and the wasm-bindgen-cli version if esign's
# Cargo.lock changed), rerun, and commit the vendor/esign/ diff.
set -euo pipefail

COMMIT="20de92305d74ff46a3eab3e173fca6348e5a1a9c"

root="$(cd "$(dirname "$0")/.." && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

git clone --quiet https://github.com/jrolli/esign.git "$stage/esign"
git -C "$stage/esign" checkout --quiet "$COMMIT"

# --lib is essential: the bin target also emits esign.wasm on wasm32 and
# would clobber the cdylib with a clap main() that exits at init.
(cd "$stage/esign" && cargo build --quiet --release --target wasm32-unknown-unknown --features wasm --lib)

rm -rf "$root/vendor/esign"
wasm-bindgen --target web --out-dir "$root/vendor/esign" \
  "$stage/esign/target/wasm32-unknown-unknown/release/esign.wasm"

cp "$stage/esign/LICENSE" "$root/vendor/esign/LICENSE" 2>/dev/null || true
{
  echo "Built from https://github.com/jrolli/esign at commit $COMMIT"
  echo "by scripts/vendor-esign.sh ($(wasm-bindgen --version))."
} > "$root/vendor/esign/PROVENANCE"

ls -la "$root/vendor/esign/"
echo "vendored esign at $COMMIT"
