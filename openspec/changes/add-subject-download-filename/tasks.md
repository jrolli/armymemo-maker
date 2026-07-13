## 1. Subject extraction and filename derivation

- [ ] 1.1 Implement `deriveDownloadFilename(source: string): string` in `src/typst-service.ts`: regex-extract the first `subject:` double-quoted string literal (with escape handling), sanitize per design D3, fall back to `memo.pdf`

## 2. Wiring

- [ ] 2.1 Carry the derived filename in the compile-result state alongside the output bytes in `src/main.ts` (design D2)
- [ ] 2.2 Use the stored filename in the Download handler instead of the hard-coded `memo.pdf`

## 3. Verification

- [ ] 3.1 Manually verify in the browser: starter example downloads as `Weekly Training Meeting Minutes.pdf`; a subject with unsafe characters is sanitized; removing the subject falls back to `memo.pdf`; filename tracks the compiled snapshot, not uncompiled edits
- [ ] 3.2 Run `npm run build` (typecheck + local-only check) cleanly
