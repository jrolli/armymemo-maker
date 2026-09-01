#!/usr/bin/env node
/**
 * Lint-worker unit check (task 3.5 of add-vale-prose-linting): exercise the
 * in-memory fs shim and the findings parser directly, then run the real Vale
 * WASM through the shim — the exact I/O path the browser worker uses, unlike
 * check-prose-style.mjs which lints via Node's real filesystem. Runs offline
 * against committed files only — part of `npm run build`.
 *
 * Node evaluates the TypeScript sources directly (type stripping), so this
 * checks the same src/lint-fs.ts and src/lint-findings.ts the bundle ships.
 * src/lint-fs.ts installs globalThis.fs at import time — before
 * vendor/vale/wasm_exec.js evaluates, mirroring the worker's import order.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";

const ROOT = new URL("..", import.meta.url).pathname;

const shim = await import("../src/lint-fs.ts");
const { parseFindings } = await import("../src/lint-findings.ts");
const lintFs = globalThis.fs;

const call = (op, ...args) =>
  new Promise((resolve) => lintFs[op](...args, (err, ...rest) => resolve({ err, rest })));

// --- fs shim behaviors -------------------------------------------------------

const encoder = new TextEncoder();
shim.setFile("/vale.ini", encoder.encode(readFileSync(join(ROOT, "vendor/vale/vale.ini"))));
for (const name of readdirSync(join(ROOT, "vendor/vale/styles/memo")).filter((f) => f.endsWith(".yml"))) {
  shim.setFile(`/styles/memo/${name}`, readFileSync(join(ROOT, "vendor/vale/styles/memo", name)));
}

{
  const { err } = await call("open", "/nope.md", 0, 0);
  assert.equal(err?.code, "ENOENT", "unknown path must be ENOENT");
}
{
  const { err } = await call("open", "/doc.md", 1 /* O_WRONLY */, 0o644);
  assert.equal(err?.code, "EROFS", "opening for write must be EROFS");
}
{
  const { err } = await call("unlink", "/vale.ini");
  assert.equal(err?.code, "EROFS", "mutations must be EROFS");
}
{
  const { err, rest } = await call("readdir", "/styles/memo");
  assert.equal(err, null);
  assert.ok(rest[0].includes("Passive.yml"), "readdir must list style files");
}
{
  const { err, rest } = await call("stat", "/styles");
  assert.equal(err, null);
  assert.ok(rest[0].isDirectory(), "/styles must stat as a directory");
}
{
  const { err: openErr, rest: [fd] } = await call("open", "/vale.ini", 0, 0);
  assert.equal(openErr, null);
  const first = new Uint8Array(6);
  await call("read", fd, first, 0, 6, null);
  const second = new Uint8Array(6);
  await call("read", fd, second, 0, 6, null);
  const expected = readFileSync(join(ROOT, "vendor/vale/vale.ini"));
  assert.deepEqual([...first, ...second], [...expected.subarray(0, 12)],
    "sequential reads must advance the fd position");
  await call("close", fd);
}

// --- findings parser ---------------------------------------------------------

assert.deepEqual(parseFindings("{}", "/doc.md"), [], "no alerts parses to no findings");
assert.deepEqual(
  parseFindings(
    JSON.stringify({ "/doc.md": [{ Check: "memo.Weasel", Severity: "warning", Message: "m", Line: 3, Span: [1, 4] }] }),
    "/doc.md",
  ),
  [{ line: 3, span: [1, 4], severity: "warning", message: "m", rule: "memo.Weasel" }],
);
assert.throws(() => parseFindings('{"Code": "E100", "Text": "boom"}', "/doc.md"), /boom/,
  "a Vale runtime error must throw its text");
assert.throws(() => parseFindings("not json", "/doc.md"), /unparseable/);

// --- the real Vale WASM through the shim -------------------------------------

await import(pathToFileURL(join(ROOT, "vendor/vale/wasm_exec.js")).href);
shim.setFile("/doc.md", encoder.encode("We will utilize the process.\n"));
shim.resetOutput();

const go = new Go();
go.argv = ["vale", "--no-exit", "--config=/vale.ini", "--output=JSON", "/doc.md"];
go.env = { HOME: "/" };
let exitCode = 0;
go.exit = (code) => {
  exitCode = code;
};
const wasm = gunzipSync(readFileSync(join(ROOT, "vendor/vale/vale.wasm.gz")));
const { instance } = await WebAssembly.instantiate(wasm, go.importObject);
await go.run(instance);
assert.equal(exitCode, 0, `vale exited ${exitCode}: ${shim.takeStderr() || shim.takeStdout()}`);

const findings = parseFindings(shim.takeStdout(), "/doc.md");
assert.ok(
  findings.some((f) => f.rule === "memo.ArmyPlain" && f.line === 1 && /utilize/i.test(f.message)),
  `expected a memo.ArmyPlain 'utilize' finding, got ${JSON.stringify(findings)}`,
);

console.log(`check-lint-shim: OK (${findings.length} findings via the shim)`);
