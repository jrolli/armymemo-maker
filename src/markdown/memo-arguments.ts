/**
 * Front-matter → `memo.with(...)` argument mapping (design D1 of
 * add-markdown-input). Mirrors upstream armymemo's pandoc template
 * (pandoc.typ) clause-for-clause — that template is the Markdown-memo
 * contract, so on armymemo bumps this file is reviewed against its diff.
 * Divergence from pandoc: unknown fields are errors rather than silently
 * ignored, so a typo cannot silently drop a recipient or an enclosure.
 * All validation problems are aggregated into a single error.
 */
import { MarkdownConversionError } from "./errors.ts";
import { typstString } from "./typst-source.ts";

const TOP_LEVEL_FIELDS = new Set([
  "office-symbol",
  "date",
  "suspense",
  "subject",
  "organization",
  "author",
  "memo-for",
  "memo-thru",
  "authority",
  "enclosures",
  "enclosures-stated",
  "distribution",
  "see-distribution",
  "distribution-separate-page",
  "cf",
  "cf-without-encls",
]);
const ADDRESS_FIELDS = ["name", "street", "city-state-zip"];
const AUTHOR_FIELDS = ["name", "rank", "branch", "title"];

const isMap = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === "string" || typeof value === "number" || typeof value === "boolean";

/**
 * The argument lines (indented, comma-terminated) for `#show: memo.with(...)`.
 * Throws MarkdownConversionError listing every missing required field and
 * every other front-matter problem at once.
 */
export function memoArguments(metadata: Record<string, unknown>): string[] {
  const missing: string[] = [];
  const problems: string[] = [];
  const lines: string[] = [];

  // A scalar rendered pandoc-style (numbers and booleans become plain
  // strings); undefined when absent, with the problem recorded when malformed.
  const scalar = (value: unknown, path: string): string | undefined => {
    if (value == null) return undefined;
    if (isScalar(value)) return String(value);
    problems.push(`\`${path}\` must be a single value`);
    return undefined;
  };

  const scalarField = (
    source: Record<string, unknown>,
    key: string,
    path: string,
    { required = false, indent = "  " } = {},
  ) => {
    if (required && source[key] == null) {
      missing.push(path);
      return;
    }
    const value = scalar(source[key], path);
    if (value !== undefined) lines.push(`${indent}${key}: ${typstString(value)},`);
  };

  const unknownFields = (source: Record<string, unknown>, known: Iterable<string>, prefix: string) => {
    const knownSet = new Set(known);
    for (const key of Object.keys(source)) {
      if (!knownSet.has(key)) problems.push(`unknown front-matter field \`${prefix}${key}\``);
    }
  };

  // A nested record like organization/author: emitted as a Typst dictionary.
  const record = (key: string, fields: string[], required: string[]) => {
    const value = metadata[key];
    if (value == null) {
      missing.push(...required.map((sub) => `${key}.${sub}`));
      return;
    }
    if (!isMap(value)) {
      problems.push(`\`${key}\` must be a mapping (indented \`field: value\` lines)`);
      return;
    }
    unknownFields(value, fields, `${key}.`);
    lines.push(`  ${key}: (`);
    for (const sub of fields) {
      scalarField(value, sub, `${key}.${sub}`, {
        required: required.includes(sub),
        indent: "    ",
      });
    }
    lines.push(`  ),`);
  };

  // memo-for / memo-thru: a list of address blocks (a single block is
  // accepted and wrapped, matching pandoc's $for$ over a lone value).
  const addressList = (key: string) => {
    const value = metadata[key];
    if (value == null) return;
    const entries = Array.isArray(value) ? value : [value];
    lines.push(`  ${key}: (`);
    entries.forEach((entry, index) => {
      const path = `${key}[${index + 1}]`;
      if (!isMap(entry)) {
        problems.push(`\`${path}\` must be a mapping with a \`name\``);
        return;
      }
      unknownFields(entry, ADDRESS_FIELDS, `${path}.`);
      if (entry.name == null) problems.push(`\`${path}\` is missing \`name\``);
      lines.push(`    (`);
      for (const sub of ADDRESS_FIELDS) {
        scalarField(entry, sub, `${path}.${sub}`, { indent: "      " });
      }
      lines.push(`    ),`);
    });
    lines.push(`  ),`);
  };

  // enclosures / distribution / cf: a list of strings (lone scalar wrapped).
  const stringList = (key: string, emitAs = key) => {
    const value = metadata[key];
    if (value == null) return;
    const entries = Array.isArray(value) ? value : [value];
    const rendered = entries
      .map((entry, index) => scalar(entry, `${key}[${index + 1}]`))
      .filter((entry): entry is string => entry !== undefined)
      .map((entry) => `${typstString(entry)},`);
    lines.push(`  ${emitAs}: (${rendered.join(" ")}),`);
  };

  // Flags: pandoc's $if$ — any truthy value emits `key: true`, absent or
  // false emits nothing.
  const flag = (key: string) => {
    if (metadata[key]) lines.push(`  ${key}: true,`);
  };

  unknownFields(metadata, TOP_LEVEL_FIELDS, "");
  scalarField(metadata, "office-symbol", "office-symbol", { required: true });
  scalarField(metadata, "date", "date");
  scalarField(metadata, "suspense", "suspense");
  scalarField(metadata, "subject", "subject", { required: true });
  record("organization", ADDRESS_FIELDS, ["name"]);
  record("author", AUTHOR_FIELDS, ["name", "rank", "branch"]);
  addressList("memo-for");
  addressList("memo-thru");
  scalarField(metadata, "authority", "authority");
  if (metadata["enclosures"] != null && metadata["enclosures-stated"] != null) {
    problems.push(
      "front matter sets both `enclosures` and `enclosures-stated` — list the " +
        "enclosures, or state only their count, not both",
    );
  } else if (metadata["enclosures-stated"] != null) {
    // The template's count-only escape hatch: emitted unquoted.
    const count = metadata["enclosures-stated"];
    if (typeof count === "number" && Number.isInteger(count)) {
      lines.push(`  enclosures: ${count},`);
    } else {
      problems.push("`enclosures-stated` must be a whole number");
    }
  } else {
    stringList("enclosures");
  }
  stringList("distribution");
  flag("see-distribution");
  flag("distribution-separate-page");
  stringList("cf");
  flag("cf-without-encls");

  if (missing.length > 0 || problems.length > 0) {
    const parts: string[] = [];
    if (missing.length > 0) {
      parts.push(
        `missing required front-matter field${missing.length === 1 ? "" : "s"}: ` +
          missing.map((path) => `\`${path}\``).join(", "),
      );
    }
    parts.push(...problems);
    throw new MarkdownConversionError(`Front matter problems — ${parts.join("; ")}.`);
  }
  return lines;
}
