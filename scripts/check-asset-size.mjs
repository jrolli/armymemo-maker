#!/usr/bin/env node
/**
 * Per-file size build check: fail if any file in dist/ is at or over 25 MiB,
 * the per-file upload cap common to static hosts (Cloudflare among them).
 * Oversized assets must ship compressed and be inflated in the browser — see
 * the compress-compiler-wasm plugin in vite.config.ts and the openspec
 * local-delivery spec.
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;
const LIMIT_BYTES = 25 * 1024 * 1024;

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

let distFiles;
try {
  distFiles = [...walk(DIST)];
} catch {
  console.error("check-asset-size: dist/ not found — run `vite build` first.");
  process.exit(1);
}

const oversized = distFiles
  .map((file) => ({ file: relative(DIST, file), bytes: statSync(file).size }))
  .filter(({ bytes }) => bytes >= LIMIT_BYTES);

if (oversized.length > 0) {
  console.error(`check-asset-size: files at or over the ${LIMIT_BYTES}-byte (25 MiB) static-host cap:`);
  for (const { file, bytes } of oversized) {
    console.error(`  ${file}: ${bytes} bytes (${(bytes / 1024 / 1024).toFixed(1)} MiB)`);
  }
  process.exit(1);
}

console.log(`check-asset-size: OK (${distFiles.length} files, all under 25 MiB)`);
