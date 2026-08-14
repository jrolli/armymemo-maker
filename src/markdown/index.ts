/**
 * Markdown memo → armymemo Typst source (design D1 of add-markdown-input).
 * The output is what upstream armymemo's pandoc template (pandoc.typ) would
 * emit for the same input — readable Typst a user could carry into the
 * editor — and flows into the existing compile pipeline unchanged.
 */
import { ARMYMEMO_VERSION } from "../armymemo-version.ts";
import { bodyToTypst } from "./body-to-typst.ts";
import { parseFrontMatter } from "./front-matter.ts";
import { memoArguments } from "./memo-arguments.ts";

export { MarkdownConversionError } from "./errors.ts";

/** Whether the conversion page should treat this file as a Markdown memo. */
export function isMarkdownFilename(name: string): boolean {
  return /\.(md|markdown)$/i.test(name);
}

/**
 * Convert a Markdown memo (YAML front matter + Markdown body) to Typst
 * source. Throws MarkdownConversionError with a user-facing message on
 * malformed front matter or unsupported body constructs.
 */
export function convertMarkdownMemo(source: string): string {
  const { metadata, body, bodyStartLine } = parseFrontMatter(source);
  const argumentLines = memoArguments(metadata);
  const typstBody = bodyToTypst(body, bodyStartLine);
  return (
    `#import "@local/armymemo:${ARMYMEMO_VERSION}": memo\n\n` +
    `#show: memo.with(\n${argumentLines.join("\n")}\n)\n\n` +
    `${typstBody}\n`
  );
}
