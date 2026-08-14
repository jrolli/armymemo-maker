#!/usr/bin/env node
/**
 * Markdown-conversion conformance check (design D5 of add-markdown-input):
 * fail the build when the converter's output drifts from the committed golden
 * Typst, or when a defined error case stops failing with its expected message.
 * Runs offline against committed files only — part of `npm run build`.
 *
 * Fixtures live in tests/markdown-conversion/:
 *   cases/<name>.md + cases/<name>.typ      convert must equal the golden
 *   errors/<name>.md + <name>.expected      convert must throw a conversion
 *                                           error containing the expected text
 *
 * cases/pandoc-example.md is upstream armymemo's own pandoc example (see its
 * PROVENANCE file). The editor's Markdown starter example (src/assets/
 * example.md, design D4 of add-editor-markdown-mode) is also checked, against
 * the golden starter-example.typ here. After an intentional converter change,
 * regenerate goldens with `node scripts/check-markdown-conversion.mjs
 * --update`, compile-verify them on the conversion page, and commit the
 * result.
 *
 * The converter is TypeScript imported directly — Node's type stripping runs
 * it without a build step.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  convertMarkdownMemo,
  MarkdownConversionError,
} from "../src/markdown/index.ts";

const ROOT = new URL("..", import.meta.url).pathname;
const FIXTURES = join(ROOT, "tests/markdown-conversion");
const update = process.argv.includes("--update");

const errors = [];
const names = (dir, suffix) =>
  readdirSync(join(FIXTURES, dir))
    .filter((f) => f.endsWith(suffix))
    .map((f) => f.slice(0, -suffix.length))
    .sort();

let checked = 0;
function checkCase(label, sourcePath, goldenPath, goldenLabel) {
  const source = readFileSync(sourcePath, "utf8");
  let converted;
  try {
    converted = convertMarkdownMemo(source);
  } catch (error) {
    errors.push(`${label}: conversion threw: ${error.message}`);
    return;
  }
  if (update) {
    writeFileSync(goldenPath, converted);
    console.log(`updated ${goldenLabel}`);
    return;
  }
  let golden;
  try {
    golden = readFileSync(goldenPath, "utf8");
  } catch {
    errors.push(`${label}: golden ${goldenLabel} is missing — run with --update`);
    return;
  }
  if (converted !== golden) {
    const convertedLines = converted.split("\n");
    const goldenLines = golden.split("\n");
    const firstDiff = convertedLines.findIndex((line, i) => line !== goldenLines[i]);
    errors.push(
      `${label}: output differs from golden at line ${firstDiff + 1}:\n` +
        `    golden:    ${JSON.stringify(goldenLines[firstDiff] ?? "<end of file>")}\n` +
        `    converted: ${JSON.stringify(convertedLines[firstDiff] ?? "<end of file>")}`,
    );
  }
  checked += 1;
}

for (const name of names("cases", ".md")) {
  checkCase(
    `cases/${name}.md`,
    join(FIXTURES, "cases", `${name}.md`),
    join(FIXTURES, "cases", `${name}.typ`),
    `cases/${name}.typ`,
  );
}

// The shipped Markdown starter example must always convert (design D4 of
// add-editor-markdown-mode); its golden lives with the other fixtures.
checkCase(
  "src/assets/example.md",
  join(ROOT, "src/assets/example.md"),
  join(FIXTURES, "starter-example.typ"),
  "starter-example.typ",
);

for (const name of names("errors", ".md")) {
  const source = readFileSync(join(FIXTURES, "errors", `${name}.md`), "utf8");
  const expected = readFileSync(join(FIXTURES, "errors", `${name}.expected`), "utf8").trim();
  try {
    convertMarkdownMemo(source);
    errors.push(`errors/${name}.md: expected a conversion error, but conversion succeeded`);
  } catch (error) {
    if (!(error instanceof MarkdownConversionError)) {
      errors.push(`errors/${name}.md: threw a non-conversion error: ${error.message}`);
    } else if (!error.message.includes(expected)) {
      errors.push(
        `errors/${name}.md: error message lacks the expected text\n` +
          `    expected to contain: ${expected}\n` +
          `    actual message:      ${error.message}`,
      );
    }
  }
  checked += 1;
}

if (errors.length > 0) {
  console.error("check-markdown-conversion: converter output drifted from the fixtures:");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
if (!update) {
  console.log(`check-markdown-conversion: OK (${checked} fixtures)`);
}
