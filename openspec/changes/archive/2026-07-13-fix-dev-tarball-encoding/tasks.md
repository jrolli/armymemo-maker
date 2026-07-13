# Tasks: fix-dev-tarball-encoding

## 1. Loader fix (design D1/D2)

- [x] 1.1 In `src/typst-service.ts`, extract the tarball fetch from `initOnce()` into a loader that sniffs the first two bytes for the gzip magic number (reusing `GZIP_MAGIC_0/1`): pass gzipped bytes through unchanged; otherwise re-gzip via `CompressionStream("gzip")` before returning
- [x] 1.2 `npx tsc --noEmit` passes (same `ReadableWritablePair` cast idiom as `fetchCompilerModule` where needed)

## 2. Verification

- [x] 2.1 Playwright against `npx vite`: the pre-filled starter example auto-compiles to a signable PDF in dev mode (previously failed with `invalid gzip header`)
- [x] 2.2 Playwright against the production bundle from a plain static server (no `Content-Encoding`): starter example still compiles to a signable PDF — the pass-through branch is unaffected
- [x] 2.3 `npm run build` passes all checks
