/**
 * Download filename derivation (design D1/D3 of add-subject-download-filename;
 * moved out of typst-service by add-compile-worker D3 so the main bundle does
 * not pull in the compiler module graph).
 */
const FALLBACK_FILENAME = "memo.pdf";
const MAX_FILENAME_STEM = 80;

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
  const stem = subject
    .replace(/[\u0000-\u001f\u007f\\/:*?"<>|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FILENAME_STEM)
    .trim();
  return stem.length > 0 ? `${stem}.pdf` : FALLBACK_FILENAME;
}
