#!/usr/bin/env node
/**
 * Precache-completeness build check (design D4 of add-offline-support): every
 * file in dist/ must be covered by the service worker's precache list, or
 * offline users would hit a hole. Near-tautological right after generate-sw
 * runs — this guards against build-order mistakes (anything emitting into
 * dist/ after the generator) the same way check-local-only guards the origin
 * rule.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

let sw;
try {
  sw = readFileSync(join(DIST, "sw.js"), "utf8");
} catch {
  console.error("check-precache: dist/sw.js not found — run generate-sw first.");
  process.exit(1);
}

const assetsMatch = /const ASSETS = (\[[^\]]*\])/.exec(sw);
if (!assetsMatch) {
  console.error("check-precache: could not find ASSETS list in dist/sw.js.");
  process.exit(1);
}
const covered = new Set(JSON.parse(assetsMatch[1]));

const missing = [];
for (const path of walk(DIST)) {
  const file = relative(DIST, path);
  if (file === "sw.js") continue; // the worker script itself is not precached
  const url = file === "index.html" ? "/" : `/${file.split(sep).join("/")}`;
  if (!covered.has(url)) {
    missing.push(file);
  }
}

if (missing.length > 0) {
  console.error("check-precache: dist/ files not covered by the service worker precache:");
  for (const file of missing) {
    console.error(`  ${file}`);
  }
  process.exit(1);
}

console.log(`check-precache: OK (${covered.size} precached URLs cover dist/)`);
