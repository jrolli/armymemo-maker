/**
 * Digest of every input the acknowledgements page is assembled from: all of
 * licenses/ plus the two vendored license texts referenced in place (the
 * repository LICENSE and the fonts' OFL file). generate-acknowledgements.mjs
 * stamps this digest into acknowledgements.html; check-acknowledgements.mjs
 * recomputes it at build time so a stale committed page fails the build.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function* walk(dir, prefix = "") {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      yield* walk(path, `${prefix}${entry}/`);
    } else {
      yield [`${prefix}${entry}`, path];
    }
  }
}

export function computeInventoryDigest(root) {
  const hash = createHash("sha256");
  const inputs = [
    ...walk(join(root, "licenses"), "licenses/"),
    ["LICENSE", join(root, "LICENSE")],
    ["src/assets/fonts/LICENSE", join(root, "src/assets/fonts/LICENSE")],
  ];
  for (const [label, path] of inputs) {
    hash.update(label);
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}
