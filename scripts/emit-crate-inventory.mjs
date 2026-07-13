#!/usr/bin/env node
/**
 * Emit a JSON inventory of the Rust crates compiled into a WASM binary, for
 * the acknowledgements page. Maintenance-time tooling: it runs cargo (which
 * uses the network to fetch the registry index and crate manifests) against a
 * scratch checkout of the pinned upstream source — never during
 * `npm run build` (design D1/D2 of add-acknowledgements-page).
 *
 * Mechanism (in place of cargo-about/cargo-license, which need not be
 * installed):
 *   1. `cargo tree -e normal --target <target> --locked` computes the
 *      normal-dependency closure of the target package for the WASM target —
 *      the set of crates whose code is compiled into (or, for proc-macros,
 *      used to build) the shipped binary. Build/dev-dependencies are excluded;
 *      `--locked` pins resolution to the upstream Cargo.lock.
 *   2. `cargo metadata --locked` supplies each crate's declared license
 *      expression, authors, and repository from its manifest.
 *
 * Usage:
 *   node scripts/emit-crate-inventory.mjs \
 *     --manifest-path <checkout>/Cargo.toml --package <crate> \
 *     [--features a,b] [--no-default-features] --out licenses/<name>.json
 *
 * Requires: cargo on PATH (any recent stable), network for the registry.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const TARGET = "wasm32-unknown-unknown";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const manifestPath = arg("--manifest-path");
const pkg = arg("--package");
const out = arg("--out");
const features = arg("--features");
const noDefaultFeatures = process.argv.includes("--no-default-features");
if (!manifestPath || !pkg || !out) {
  console.error(
    "usage: emit-crate-inventory.mjs --manifest-path <Cargo.toml> --package <crate>" +
      " [--features a,b] [--no-default-features] --out <file.json>",
  );
  process.exit(1);
}

const featureArgs = [
  ...(noDefaultFeatures ? ["--no-default-features"] : []),
  ...(features ? ["--features", features] : []),
];

function cargo(args) {
  return execFileSync("cargo", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
}

// 1. Dependency closure of the compiled binary.
const tree = cargo([
  "tree",
  "--manifest-path", manifestPath,
  "--package", pkg,
  "--target", TARGET,
  "--edges", "normal",
  "--prefix", "none",
  "--format", "{p}",
  "--locked",
  ...featureArgs,
]);
const inClosure = new Set();
for (const line of tree.split("\n")) {
  const match = line.match(/^([A-Za-z0-9_-]+) v(\S+)/);
  if (match) inClosure.add(`${match[1]} ${match[2]}`);
}

// 2. License/author/repository metadata for every crate in the closure.
const metadata = JSON.parse(
  cargo(["metadata", "--manifest-path", manifestPath, "--format-version", "1", "--locked"]),
);
const crates = [];
for (const p of metadata.packages) {
  const key = `${p.name} ${p.version}`;
  if (!inClosure.has(key) || p.name === pkg) continue; // root listed as a top-level component
  crates.push({
    name: p.name,
    version: p.version,
    license: p.license ?? (p.license_file ? `SEE-LICENSE-FILE (${p.license_file})` : null),
    authors: p.authors ?? [],
    repository: p.repository ?? null,
  });
}
crates.sort((a, b) => (a.name === b.name ? a.version.localeCompare(b.version) : a.name.localeCompare(b.name)));

const unlicensed = crates.filter((c) => c.license === null);
if (unlicensed.length > 0) {
  console.error(
    `emit-crate-inventory: crates with no declared license need manual resolution: ` +
      unlicensed.map((c) => `${c.name}@${c.version}`).join(", "),
  );
  process.exit(1);
}

writeFileSync(out, `${JSON.stringify(crates, null, 2)}\n`);
console.log(`emit-crate-inventory: wrote ${out} (${crates.length} crates for ${pkg})`);
