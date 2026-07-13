## Context

The armymemo package archive is imported with `?url` and fetched at init in
`src/typst-service.ts`. typst.ts's `fetchPackageBy` callback must return the
*gzipped* tarball bytes — its Rust side inflates them itself. Vite's dev
server infers `Content-Encoding: gzip` from the `.gz` extension (verified with
curl: `Content-Encoding: gzip`, empty `Content-Type`), so in dev the browser
inflates the body before the app sees it and the loader receives a raw tar.

The sibling problem for the compiler WASM was already solved in
`compress-compiler-wasm` design D4 by sniffing the gzip magic bytes instead of
trusting the delivery path.

## Goals / Non-Goals

**Goals:**

- The starter example compiles in `npm run dev`.
- The fix is host-agnostic: the same code path also protects production
  against hosts that apply gzip `Content-Encoding` to `.gz` assets.
- No behavior change on delivery paths that already work (plain static hosts,
  the production service-worker cache).

**Non-Goals:**

- Patching Vite's dev middleware or renaming the vendored file to dodge the
  extension inference (fixes only this host's quirk, not the class of quirk).
- Changing how typst.ts consumes the archive.

## Decisions

### D1: restore the gzip layer in the loader, not the server

A dev-only Vite middleware stripping the header would fix dev but leave
production exposed to hosts with the same inference, and would be a second
place where delivery quirks are patched. The loader already owns this concern
for the compiler WASM (magic-byte sniff, compress-compiler-wasm D4); the
tarball gets the mirrored treatment. Sniff `0x1f 0x8b`: present → pass bytes
through untouched (today's production path, zero cost); absent → the transit
stripped the gzip layer, so re-gzip in the browser with
`CompressionStream("gzip")` before handing bytes to typst.ts, which requires
a gzipped archive. Compression level of the re-gzip is irrelevant to
correctness (typst.ts just inflates it); ~190 KB costs milliseconds, and the
path never runs on conforming hosts.

### D2: reuse the existing magic constants and casting idiom

`GZIP_MAGIC_0/1` already exist in `typst-service.ts`; the `CompressionStream`
pipeThrough needs the same `ReadableWritablePair` cast as the
`DecompressionStream` in `fetchCompilerModule` (lib.dom types the writable
side as `WritableStream<BufferSource>`, which strict variance rejects).

## Risks / Trade-offs

- [Non-gzip bytes that are also not a valid tar (e.g. a 404 HTML page slipped
  through)] → they get gzipped and handed to typst.ts, whose tar parsing then
  fails with its normal package diagnostic — same failure surface as today,
  one step later.
- [Double-compressed delivery (host gzips the already-gzipped file as
  transfer encoding)] → browser strips exactly the transfer layer; the app
  still sees gzip magic and passes through. Correct by construction.

## Migration Plan

Loader-only change; no build or deploy implications. Rollback is a revert.

## Open Questions

None.
