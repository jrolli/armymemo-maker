## Context

Downloads are hard-coded to `link.download = "memo.pdf"` in `main.ts`. The natural name is the memo's SUBJECT line, but the vendored armymemo package neither sets `document.title` nor emits subject metadata, and `<esign-field>` is the only queryable metadata in the compiled document. The armymemo pin is fixed by the vendoring policy, so the subject must come from the memo source itself.

## Goals / Non-Goals

**Goals:**
- Subject-derived, filesystem-safe download filenames with a `memo.pdf` fallback that can never produce a broken name.
- The filename always corresponds to the source snapshot that produced the downloaded bytes.

**Non-Goals:**
- Upstream armymemo changes (e.g., emitting subject metadata or setting `document.title`) — revisit if the pin is ever bumped.
- Setting the PDF's internal title metadata; only the download attribute changes.
- User-editable filename UI.

## Decisions

**D1 — Extract the subject from source text, not the compiled document.** A tolerant regex over the compiled source snapshot matches a `subject:` argument with a double-quoted string value (handling `\"` and `\\` escapes) and unescapes it. Alternatives — Typst query (no subject metadata exists in the pinned package) and full Typst parsing (wildly disproportionate) — rejected. The regex approach fails soft: non-literal subjects (expressions, variables) simply yield the fallback.

**D2 — Extraction runs on the compile-result snapshot.** The compile pipeline already captures the source it compiled; the derived filename is stored alongside the output bytes in the compile result state, so Download never re-reads the live editor (which may have newer, uncompiled text).

**D3 — Sanitization rule.** Strip control characters and `\\ / : * ? " < > |`, collapse runs of whitespace to single spaces, trim, cap at 80 characters, and append `.pdf`. If the result before the extension is empty, use `memo.pdf`. Spaces are preserved (subjects are prose; browsers and filesystems handle them fine). Alternative — kebab-casing — rejected: `weekly-training-meeting-minutes.pdf` is less readable than the natural subject and gains nothing.

**D4 — Pure helper, unit-conscious placement.** Extraction + sanitization live in a small pure function (`deriveDownloadFilename(source): string`) in `typst-service.ts` next to the other source-shaped logic, keeping `main.ts` to wiring.

## Risks / Trade-offs

- [Regex misses valid Typst forms (single-source-of-truth violation with the compiler's own parse)] → Fallback to `memo.pdf` is always safe; the dominant armymemo usage is a literal string argument, as in the starter example.
- [A `subject:` key in unrelated context (e.g., inside a comment or another dict) matches first] → Accepted: worst case is a cosmetic misname; matching the first occurrence mirrors how memos are written in practice (one `memo.with` call).
- [Very long subjects] → 80-char cap keeps filenames portable across filesystems.
