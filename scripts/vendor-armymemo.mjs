#!/usr/bin/env node
/**
 * Regenerate vendor/armymemo-0.2.1.tar.gz from a pinned commit of
 * github.com/jrolli/armymemo. Network is used here, at maintenance time only —
 * never at build or runtime (the tarball is committed; see design D3).
 *
 * Usage: node scripts/vendor-armymemo.mjs
 * Requires: system `tar` on PATH.
 *
 * When bumping: update COMMIT (and VERSION if typst.toml changed), rerun, and
 * update to match: the starter example's `#import` line, ARMYMEMO_VERSION in
 * src/armymemo-version.ts, licenses/manifest.json, and the vendored
 * pandoc-example fixture in tests/markdown-conversion/ (then diff upstream's
 * pandoc.typ against src/markdown/memo-arguments.ts, which mirrors it).
 * check-acknowledgements.mjs enforces that all version pins move together.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

const COMMIT = "f649d1b4dc3c0bab68eab652ff0c78d128f5626e";
const VERSION = "0.2.1";
// The package payload: everything lib.typ needs at compile time, plus license.
// lib.typ imports the eform helpers from armymemo's own vendored copy, so the
// tarball must carry that subtree too.
const FILES = [
  "typst.toml",
  "lib.typ",
  "DOD_Seal_BW.png",
  "DOW_Seal_BW.png",
  "LICENSE",
  "vendor/eform/typst.toml",
  "vendor/eform/lib.typ",
];

const root = new URL("..", import.meta.url).pathname;
const stage = join(root, `vendor/.stage-armymemo-${VERSION}`);
const out = join(root, `vendor/armymemo-${VERSION}.tar.gz`);

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

for (const file of FILES) {
  const url = `https://raw.githubusercontent.com/jrolli/armymemo/${COMMIT}/${file}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`vendor-armymemo: ${response.status} fetching ${url}`);
    process.exit(1);
  }
  mkdirSync(dirname(join(stage, file)), { recursive: true });
  writeFileSync(join(stage, file), Buffer.from(await response.arrayBuffer()));
  console.log(`fetched ${file}`);
}

mkdirSync(join(root, "vendor"), { recursive: true });
execFileSync("tar", ["czf", out, "-C", stage, ...FILES]);
rmSync(stage, { recursive: true, force: true });
console.log(`wrote ${out} (commit ${COMMIT})`);
