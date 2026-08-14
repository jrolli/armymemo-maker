/**
 * Front-matter handling for Markdown memos (design D3 of add-markdown-input).
 * A memo must begin with a `---`-delimited YAML block (closed by `---` or
 * `...`, as pandoc accepts); its absence is the clearest "this is not a
 * Markdown memo" signal and gets a pointed error. YAML problems surface with
 * line/column positions adjusted to the whole file.
 */
import { parse, YAMLParseError } from "yaml";
import { MarkdownConversionError } from "./errors.ts";

export interface FrontMatterSplit {
  /** The parsed YAML mapping of memo fields. */
  metadata: Record<string, unknown>;
  /** The Markdown body following the closing delimiter. */
  body: string;
  /** 1-indexed line of the original file where the body begins. */
  bodyStartLine: number;
}

export function parseFrontMatter(source: string): FrontMatterSplit {
  const lines = source.replace(/^﻿/, "").split(/\r\n?|\n/);
  if (lines[0]?.trimEnd() !== "---") {
    throw new MarkdownConversionError(
      "A Markdown memo must begin with YAML front matter: a `---` line, the memo " +
        "metadata (office symbol, subject, organization, author, …), and a closing " +
        "`---` line. See the armymemo pandoc example for the format.",
    );
  }
  const closing = lines.findIndex(
    (line, index) => index > 0 && (line.trimEnd() === "---" || line.trimEnd() === "..."),
  );
  if (closing === -1) {
    throw new MarkdownConversionError(
      "The YAML front matter is never closed — add a `---` line after the memo metadata.",
    );
  }

  let metadata: unknown;
  try {
    metadata = parse(lines.slice(1, closing).join("\n"));
  } catch (error) {
    if (error instanceof YAMLParseError) {
      const position = error.linePos?.[0];
      // +1: the front matter starts on line 2 of the file, after the opening ---.
      const where = position ? ` (line ${position.line + 1}, column ${position.col})` : "";
      throw new MarkdownConversionError(
        `The front matter is not valid YAML${where}: ${error.message}`,
      );
    }
    throw error;
  }
  if (metadata === null || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new MarkdownConversionError(
      "The front matter must be a YAML mapping of memo fields (key: value lines).",
    );
  }

  return {
    metadata: metadata as Record<string, unknown>,
    body: lines.slice(closing + 1).join("\n"),
    bodyStartLine: closing + 2,
  };
}
