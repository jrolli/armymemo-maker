#!/usr/bin/env bash
# Regenerate vendor/vale/ (vale.wasm.gz + wasm_exec.js + PROVENANCE) and
# licenses/vale-modules.json from a pinned commit of
# github.com/errata-ai/vale, patched to build for js/wasm (design D1 of
# add-vale-prose-linting). Network and Go toolchain are used here, at
# maintenance time only — never at app build or runtime.
#
# Requires: git, node, and a go >= 1.21 on PATH; GOTOOLCHAIN pins the exact
# toolchain below, so any host go merely bootstraps the pinned one. The
# vendored wasm_exec.js is copied from that same pinned toolchain — a
# version-mismatched pair panics at the first filesystem call.
#
# When bumping: update COMMIT (and GO_VERSION if Vale's go.mod moved), rerun,
# and commit the vendor/vale/ diff plus the refreshed
# licenses/vale-modules.json; then rerun
# `node scripts/generate-acknowledgements.mjs` and commit the regenerated
# acknowledgements.html (check-acknowledgements.mjs enforces all of this).
# If the patch no longer applies, re-derive it: it only moves the
# tree-sitter-dependent lintCode/lintFragments paths (cgo, impossible under
# js/wasm) behind !js build tags with a stub delegating to lintCodeOld.
set -euo pipefail

COMMIT="5d338235328cccff03a0758d0bc692f35428bed8"
GO_VERSION="1.25.7"

export GOTOOLCHAIN="go${GO_VERSION}"

root="$(cd "$(dirname "$0")/.." && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT

git clone --quiet https://github.com/errata-ai/vale.git "$stage/vale"
git -C "$stage/vale" checkout --quiet "$COMMIT"
git -C "$stage/vale" apply "$root/scripts/vale-wasm.patch"

(cd "$stage/vale" && GOOS=js GOARCH=wasm \
  go build -trimpath -ldflags="-s -w" -o "$stage/vale.wasm" ./cmd/vale)

# The pinned toolchain's root (not the bootstrap go's): wasm_exec.js and the
# Node runner used for the smoke test below both must come from it.
goroot="$(cd "$stage/vale" && go env GOROOT)"

# Emit the Go-module inventory from the binary just built, so notices and
# artifact can never come from different builds (mirrors vendor-eform.sh).
node "$root/scripts/emit-gomod-inventory.mjs" \
  --module-dir "$stage/vale" --package ./cmd/vale \
  --out "$root/licenses/vale-modules.json"

# Smoke test under Node with the same-toolchain runner: --version must run,
# and a real lint must return a JSON alert (a wasm_exec pairing or patch
# regression fails here, not in the browser).
mkdir -p "$stage/smoke/styles/t"
cat > "$stage/smoke/styles/t/Wordy.yml" <<'EOF'
extends: existence
message: "'%s' is too wordy."
level: warning
ignorecase: true
tokens:
  - in order to
EOF
cat > "$stage/smoke/.vale.ini" <<'EOF'
StylesPath = styles
MinAlertLevel = suggestion
[*.md]
BasedOnStyles = t
EOF
echo "We write in order to be read." > "$stage/smoke/doc.md"
version_out="$(cd "$stage/smoke" && node "$goroot/lib/wasm/wasm_exec_node.js" "$stage/vale.wasm" --version)"
echo "$version_out"
lint_out="$(cd "$stage/smoke" && node "$goroot/lib/wasm/wasm_exec_node.js" "$stage/vale.wasm" \
  --no-exit --config="$stage/smoke/.vale.ini" --output=JSON "$stage/smoke/doc.md")"
echo "$lint_out" | grep -q '"Check": "t.Wordy"' || {
  echo "smoke test failed: expected a t.Wordy alert, got:" >&2
  echo "$lint_out" >&2
  exit 1
}

mkdir -p "$root/vendor/vale"
rm -f "$root/vendor/vale/vale.wasm.gz" "$root/vendor/vale/wasm_exec.js" \
  "$root/vendor/vale/LICENSE" "$root/vendor/vale/PROVENANCE"
gzip -9 -n -c "$stage/vale.wasm" > "$root/vendor/vale/vale.wasm.gz"
cp "$goroot/lib/wasm/wasm_exec.js" "$root/vendor/vale/wasm_exec.js"
cp "$stage/vale/LICENSE" "$root/vendor/vale/LICENSE"
{
  echo "Built from https://github.com/errata-ai/vale at commit $COMMIT"
  echo "with scripts/vale-wasm.patch applied (js/wasm build: tree-sitter"
  echo "code-linting paths behind !js build tags), by scripts/vendor-vale.sh"
  echo "(GOOS=js GOARCH=wasm, go $GO_VERSION, gzip -9 -n)."
  echo "wasm_exec.js is from the same go $GO_VERSION toolchain and must only"
  echo "ever be updated together with vale.wasm.gz."
} > "$root/vendor/vale/PROVENANCE"

ls -la "$root/vendor/vale/"
echo "vendored vale at $COMMIT"
