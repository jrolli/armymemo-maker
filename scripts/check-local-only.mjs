#!/usr/bin/env node
/**
 * Local-only build check: fail if anything in dist/ references an external
 * http(s) origin. The delivered bundle must be fully self-contained — no CDNs,
 * no analytics, no remote assets (see openspec local-delivery spec).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;

// URL-shaped strings that are identifiers, not network fetches.
const ALLOWED_PREFIXES = [
  "http://www.w3.org/", // XML/SVG/XHTML namespace URIs
  // Dead-code URL strings bundled from vendored typst.ts: its default font
  // CDN and default package registry. Both defaults are replaced at runtime
  // (disableDefaultFontAssets + local armymemo package fetcher), and the
  // production CSP blocks these origins outright. Live enforcement is the
  // CSP plus the Playwright same-origin network assertions — this scan
  // cannot tell a dead string from a fetched one.
  "https://cdn.jsdelivr.net/gh/typst/typst-assets@",
  "https://cdn.jsdelivr.net/gh/typst/typst-dev-assets@",
  "https://packages.typst.org/preview/",
];

const TEXT_EXTENSIONS = new Set([
  ".html", ".js", ".mjs", ".css", ".json", ".svg", ".txt", ".map", ".webmanifest",
]);

const URL_PATTERN = /https?:\/\/[^\s"'`<>()\\]+/g;

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
  console.error("check-local-only: dist/ not found — run `vite build` first.");
  process.exit(1);
}

const violations = [];
for (const file of distFiles) {
  const extension = file.slice(file.lastIndexOf("."));
  if (!TEXT_EXTENSIONS.has(extension)) continue;
  const content = readFileSync(file, "utf8");
  for (const match of content.match(URL_PATTERN) ?? []) {
    if (!ALLOWED_PREFIXES.some((prefix) => match.startsWith(prefix))) {
      violations.push({ file: relative(DIST, file), match });
    }
  }
}

if (violations.length > 0) {
  console.error("check-local-only: external origin references found in dist/:");
  for (const { file, match } of violations) {
    console.error(`  ${file}: ${match}`);
  }
  process.exit(1);
}

console.log(`check-local-only: OK (${distFiles.length} files scanned, no external origins)`);
