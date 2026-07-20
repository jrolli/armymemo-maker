/**
 * Download filename derivation (design D1/D3 of add-subject-download-filename;
 * moved out of typst-service by add-compile-worker D3 so the main bundle does
 * not pull in the compiler module graph).
 */
const FALLBACK_FILENAME = "memo.pdf";
const MAX_FILENAME_STEM = 80;

/**
 * Sanitize a candidate filename stem: strip characters not permitted in
 * common filesystems, collapse whitespace, and bound the length. May return
 * an empty string, in which case callers fall back to `memo.pdf`.
 */
export function sanitizeFilenameStem(stem: string): string {
  return stem
    .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FILENAME_STEM)
    .trim();
}

/**
 * Derive the download filename for a converted source file: the source
 * filename with its final extension replaced by `.pdf` (design D3 of
 * add-file-compile-page). A name without an extension is used whole; an
 * empty sanitized stem falls back to `memo.pdf`.
 */
export function deriveConvertedFilename(sourceName: string): string {
  const dot = sourceName.lastIndexOf(".");
  const stem = sanitizeFilenameStem(dot > 0 ? sourceName.slice(0, dot) : sourceName);
  return stem.length > 0 ? `${stem}.pdf` : FALLBACK_FILENAME;
}

/**
 * Derive the download filename from the memo's SUBJECT line. The vendored
 * armymemo package emits no subject metadata, so this reads the first
 * `subject: "..."` string literal from the compiled source snapshot; anything
 * else (expression subjects, missing subject) falls back to `memo.pdf`.
 */
export function deriveDownloadFilename(source: string): string {
  const match = /\bsubject\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(source);
  if (!match) {
    return FALLBACK_FILENAME;
  }
  const subject = (match[1] ?? "").replace(/\\(u\{[0-9a-fA-F]+\}|.)/g, (_, escaped: string) => {
    if (escaped === "n" || escaped === "r" || escaped === "t") return " ";
    if (escaped.startsWith("u{")) {
      return String.fromCodePoint(parseInt(escaped.slice(2, -1), 16));
    }
    return escaped;
  });
  const stem = sanitizeFilenameStem(subject);
  return stem.length > 0 ? `${stem}.pdf` : FALLBACK_FILENAME;
}
