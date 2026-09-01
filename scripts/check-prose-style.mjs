#!/usr/bin/env node
/**
 * Prose-style conformance check (task 2.3 of add-vale-prose-linting): run
 * the vendored Vale WASM against fixture memos and fail the build when the
 * bundled style or config stops behaving as specified. Runs offline against
 * committed files only — part of `npm run build` — and doubles as the proof
 * that vale.wasm.gz and wasm_exec.js are a working, version-matched pair.
 *
 * Fixtures live in tests/prose-style/; the Typst starter example
 * (src/assets/example.typ) is checked directly so the shipped example can
 * never acquire markup false positives. Expectations are the assertions
 * below, not goldens: they encode the spec scenarios (planted issues found
 * at their lines, Typst markup masked, no copula flagging) while staying
 * robust to incidental style edits.
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// The Go runtime writes through the global fs object and exits the process
// via go.exit; both are per-run state, so the lint runs in a child process
// (one `node -e` per invocation would also work, but a single child linting
// every fixture at once keeps the check fast).
const RUNNER = `
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const [root, ...files] = process.argv.slice(1);
const require = createRequire(import.meta.url);
globalThis.require = require;
globalThis.fs = require("node:fs");
globalThis.path = require("node:path");

await import(pathToFileURL(root + "/vendor/vale/wasm_exec.js").href);
const go = new Go();
go.argv = [
  "vale",
  "--no-exit",
  "--config=" + root + "/vendor/vale/vale.ini",
  "--output=JSON",
  ...files,
];
go.exit = (code) => {
  if (code !== 0) process.exit(code);
};
const wasm = gunzipSync(readFileSync(root + "/vendor/vale/vale.wasm.gz"));
const { instance } = await WebAssembly.instantiate(wasm, go.importObject);
await go.run(instance);
`;

const files = {
  wordy: join(ROOT, "tests/prose-style/wordy.md"),
  copula: join(ROOT, "tests/prose-style/copula.md"),
  inline: join(ROOT, "tests/prose-style/inline.typ"),
  starter: join(ROOT, "src/assets/example.typ"),
};

const stdout = execFileSync(
  process.execPath,
  ["--input-type=module", "-e", RUNNER, ROOT, ...Object.values(files)],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);

let byFile;
try {
  byFile = JSON.parse(stdout);
} catch {
  console.error(`check-prose-style: vale did not emit JSON:\n${stdout}`);
  process.exit(1);
}
const alerts = (key) => byFile[files[key]] ?? [];

const errors = [];
function expect(key, description, predicate) {
  const found = alerts(key).filter(predicate);
  if (found.length === 0) {
    errors.push(`${key}: expected ${description}`);
  }
}
function forbid(key, description, predicate) {
  for (const alert of alerts(key).filter(predicate)) {
    errors.push(
      `${key}: forbidden ${description}: ${alert.Check} '${alert.Match}' at line ${alert.Line}`,
    );
  }
}

// wordy.md — planted issues surface at the lines they sit on.
expect("wordy", "memo.Passive 'was written' on line 5",
  (a) => a.Check === "memo.Passive" && a.Line === 5);
expect("wordy", "memo.ArmyPlain 'in accordance with' on line 5",
  (a) => a.Check === "memo.ArmyPlain" && a.Line === 5 && /in accordance with/i.test(a.Match));
expect("wordy", "memo.Weasel 'very' on line 6",
  (a) => a.Check === "memo.Weasel" && a.Line === 6);
expect("wordy", "memo.ArmyPlain 'utilize' on line 8",
  (a) => a.Check === "memo.ArmyPlain" && a.Line === 8 && /utilize/i.test(a.Match));
expect("wordy", "memo.ArmyPlain 'in order to' on line 8",
  (a) => a.Check === "memo.ArmyPlain" && a.Line === 8 && /in order to/i.test(a.Match));

// copula.md — a plain "is" with no passive construction stays silent.
forbid("copula", "alert on the copula fixture", () => true);

// inline.typ — hash directives, math, labels, and references are masked;
// the ordinary prose around them is clean, so the file yields nothing.
forbid("inline", "alert on masked Typst markup", () => true);

// The shipped Typst starter example: its preamble (through the blank line
// after `#show: memo.with(...)`) must never produce a finding, while its
// body keeps demonstrating a real one ("was held" is passive).
const starterPreambleEnd = 14;
forbid("starter", "alert in the starter example's preamble",
  (a) => a.Line <= starterPreambleEnd);
expect("starter", "memo.Passive in the starter example's body",
  (a) => a.Check === "memo.Passive" && a.Line > starterPreambleEnd);

if (errors.length > 0) {
  console.error("check-prose-style: FAILED");
  for (const e of errors) console.error(`  ${e}`);
  console.error("\nFull output:\n" + JSON.stringify(byFile, null, 2));
  process.exit(1);
}
const total = Object.values(byFile).reduce((n, a) => n + a.length, 0);
console.log(`check-prose-style: OK (${total} alerts across ${Object.keys(files).length} fixtures)`);
