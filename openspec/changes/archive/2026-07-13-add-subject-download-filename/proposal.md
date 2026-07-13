## Why

Every download is named `memo.pdf`, so users producing multiple memos get colliding, meaningless filenames (`memo (3).pdf`) and must rename by hand. The memo's SUBJECT line is the natural, AR 25-50-meaningful name for the file.

## What Changes

- The Download action names the saved PDF after the memo's subject (sanitized for filesystem safety, `.pdf` extension) instead of the fixed `memo.pdf`.
- The subject is taken from the same source snapshot that produced the downloaded PDF, so the name always matches the content.
- When no subject can be determined (missing, empty, or unparseable), the filename falls back to `memo.pdf` — never a broken or empty name.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `pdf-output`: the "Download of the compiled PDF" requirement changes — the saved filename is derived from the memo's subject with a sanitization rule and a `memo.pdf` fallback, rather than always being `memo.pdf`.

## Impact

- `src/main.ts`: download handler derives the filename from the compiled source's subject.
- `src/typst-service.ts` (or a small helper module): subject extraction from the compiled source snapshot.
- No changes to compilation, extraction, esign, vendored assets, or the local-only delivery model. The vendored armymemo package emits no subject metadata, so extraction reads the memo source itself (see design).
