#!/usr/bin/env node
/**
 * Emit a JSON inventory of the Go modules compiled into a WASM binary, for
 * the acknowledgements page — the Go counterpart of emit-crate-inventory.mjs,
 * producing the same shape ({name, version, license, authors, repository}).
 * Maintenance-time tooling, invoked by scripts/vendor-vale.sh; never runs
 * during `npm run build`.
 *
 * Mechanism:
 *   1. `go list -deps` over the entrypoint package, in the pinned checkout
 *      with GOOS=js GOARCH=wasm, yields the modules whose packages are in the
 *      compiled dependency closure for that target. (`go version -m` would
 *      read the list from the artifact itself, but its buildinfo reader does
 *      not understand js/wasm binaries.)
 *   2. Each module's LICENSE file is read from the module cache (populated by
 *      the build that just produced the binary) and classified into an SPDX id
 *      by fingerprint. Go modules declare no license metadata, so an
 *      unclassifiable text fails loudly for a manual OVERRIDES entry rather
 *      than guessing.
 *
 * Usage:
 *   node scripts/emit-gomod-inventory.mjs \
 *     --module-dir <checkout> --package <./cmd/...> --out <file.json>
 *   (GOTOOLCHAIN/GOPATH must match the build so the cache lookup does.)
 */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function arg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const moduleDir = arg("--module-dir");
const entrypoint = arg("--package");
const out = arg("--out");
if (!moduleDir || !entrypoint || !out) {
  console.error(
    "usage: emit-gomod-inventory.mjs --module-dir <checkout> --package <./cmd/...> --out <file.json>",
  );
  process.exit(1);
}

// Modules whose license file defeats the fingerprints below.
const OVERRIDES = new Map([
  // path -> SPDX expression
]);

const go = (args, opts = {}) =>
  execFileSync("go", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, ...opts });

// --- 1. Module closure of the compiled target --------------------------------

const listed = go(
  ["list", "-deps", "-f", "{{if .Module}}{{if not .Module.Main}}{{.Module.Path}}\t{{.Module.Version}}{{end}}{{end}}", entrypoint],
  { cwd: moduleDir, env: { ...process.env, GOOS: "js", GOARCH: "wasm" } },
);
const deps = [...new Set(listed.split("\n").filter(Boolean))].map((line) => {
  const [path, version] = line.split("\t");
  return { path, version };
});
if (deps.length === 0) {
  console.error(`emit-gomod-inventory: no dependency modules for ${entrypoint} in ${moduleDir}`);
  process.exit(1);
}

// --- 2. License classification from the module cache -------------------------

const modCache = go(["env", "GOMODCACHE"]).trim();

// Module-cache path encoding: uppercase letters become !lowercase.
const escapePath = (p) => p.replace(/!/g, "!!").replace(/[A-Z]/g, (c) => `!${c.toLowerCase()}`);

function licenseFileText(dir) {
  const names = readdirSync(dir).filter((f) =>
    /^(licen[cs]e|copying)(\.(md|txt|markdown))?$/i.test(f),
  );
  if (names.length === 0) return undefined;
  return readFileSync(join(dir, names[0]), "utf8");
}

function classify(text) {
  const t = text.replace(/\s+/g, " ");
  if (/Apache License/i.test(t) && /Version 2\.0/i.test(t)) return "Apache-2.0";
  if (/Mozilla Public License/i.test(t) && /2\.0/.test(t)) return "MPL-2.0";
  if (/Permission to use, copy, modify/i.test(t) && /ISC/i.test(text)) return "ISC";
  if (/BSD Zero Clause|Zero-Clause BSD/i.test(t)) return "0BSD";
  if (/Redistribution and use in source and binary forms/i.test(t)) {
    return /Neither the name/i.test(t) ? "BSD-3-Clause" : "BSD-2-Clause";
  }
  if (/Permission is hereby granted, free of charge/i.test(t)) return "MIT";
  return undefined;
}

const inventory = [];
const failures = [];
for (const { path, version } of deps) {
  let license = OVERRIDES.get(path);
  if (!license) {
    const dir = join(modCache, `${escapePath(path)}@${version}`);
    let text;
    try {
      text = licenseFileText(dir);
    } catch {
      text = undefined;
    }
    license = text && classify(text);
  }
  if (!license) {
    failures.push(`${path}@${version}`);
    continue;
  }
  inventory.push({
    name: path,
    version,
    license,
    authors: [],
    repository: `https://${path.replace(/\/v\d+$/, "")}`,
  });
}

if (failures.length > 0) {
  console.error(
    "emit-gomod-inventory: could not classify licenses for:\n" +
      failures.map((f) => `  ${f}`).join("\n") +
      "\nInspect each module's license file and add an OVERRIDES entry.",
  );
  process.exit(1);
}

inventory.sort((a, b) => a.name.localeCompare(b.name));
writeFileSync(out, JSON.stringify(inventory, null, 2) + "\n");
console.log(`wrote ${inventory.length} Go modules to ${out}`);
