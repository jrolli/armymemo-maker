/**
 * Typst source emission helpers shared by the metadata and body emitters
 * (design D3 of add-markdown-input). The escape set mirrors pandoc's Typst
 * writer so converted prose can never activate Typst syntax: every character
 * with inline markup meaning is backslash-escaped, and characters that only
 * open constructs at a line start (headings, list/enum markers) are handled
 * by `protectLineStart` on each emitted physical line.
 */

/** A Typst string literal for `value`, newline-safe and quote-escaped. */
export function typstString(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r\n?/g, "\n")
    .replace(/\n/g, "\\n");
  return `"${escaped}"`;
}

// Inline-position markup: escape everywhere. `/` is included because a
// doubled slash (as in any URL pasted into prose) would open a comment.
const INLINE_MARKUP = /[\\#$*_[\]<>@~`/]/g;

/** Escape a plain-text run so it renders literally in Typst markup. */
export function escapeText(text: string): string {
  return text.replace(INLINE_MARKUP, (character) => `\\${character}`);
}

/**
 * Escape leading markup that would start a block on this line: headings
 * (`=`), list markers (`- `, `+ `), and enum markers (`1. ` — escaped at the
 * period, since `\` before a digit is not a Typst escape).
 */
export function protectLineStart(line: string): string {
  if (/^(?:=+|[-+])(?:\s|$)/.test(line)) return `\\${line}`;
  return line.replace(/^(\d+)\.(?=\s|$)/, "$1\\.");
}
