/**
 * Conversion failure for a Markdown memo (design D2-D4 of add-markdown-input).
 * The message is user-facing and self-contained: the conversion page shows it
 * verbatim in the diagnostics pane, so every raiser states what is wrong and,
 * where known, the source location.
 */
export class MarkdownConversionError extends Error {}
