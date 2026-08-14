## Context

The app resolves the vendored armymemo package through `TypstSnippet.fetchPackageBy(accessModel, fetcher)` in `src/typst-service.ts`. That helper wraps typst.ts's `FetchPackageRegistry` (typst.ts 0.7.0, `fs/package`), overriding only `pullPackageData` — the byte source. The inherited `resolve(spec, context)` returns `undefined` for any `spec.namespace !== 'preview'` before the app's fetcher is ever consulted, so `#import "@local/armymemo:0.2.1"` currently fails with "package not found" even though the bytes are on hand.

armymemo is not published to Typst Universe, so `@preview` is a misnomer; `@local` is Typst's conventional namespace for packages installed outside the registry and is what locally authored files use. The proposal widens resolution to both namespaces and makes `@local` the taught form. Constraints carried over unchanged: no runtime network beyond same-origin static assets, everything vendored, and non-vendored imports must keep failing with a diagnostic naming the package.

A Typst package archive does not encode a namespace (`typst.toml` carries name and version only), so the existing `vendor/armymemo-0.2.1.tar.gz` serves both spellings; the namespace exists only in import paths and in the resolver's gate.

## Goals / Non-Goals

**Goals:**
- `@local/armymemo:0.2.1` and `@preview/armymemo:0.2.1` both resolve to the vendored archive, offline, in the main app and the file-compile page (both share `typst-service.ts`).
- The starter example and documentation teach `@local` as the preferred form.
- Existing drafts and user files that import `@preview/armymemo:0.2.1` compile unchanged.
- Any other package spec — wrong name, wrong version, or a namespace other than these two — fails exactly as today.

**Non-Goals:**
- No general `@local` package support: only the vendored armymemo resolves; this is not a mechanism for users to load arbitrary local packages.
- No migration or rewriting of stored drafts — a draft that says `@preview` stays as the user wrote it.
- No changes to the vendor pipeline, tarball contents, eform integration, or the acknowledgements inventory.
- No targeted "use @local instead" diagnostic for `@preview` imports of other packages; the standard package-not-found diagnostic stays.

## Decisions

### D1: Replace `fetchPackageBy` with an app-owned registry subclass, normalizing namespace in `resolve`

`src/typst-service.ts` stops using `TypstSnippet.fetchPackageBy` and instead registers its own registry class:

- Subclass `FetchPackageRegistry` (imported from `@myriaddreamin/typst.ts/fs/package`).
- Override `pullPackageData(spec)` to return the vendored tarball when `spec.name === "armymemo" && spec.version === "0.2.1"`, else `undefined` — the same fetcher logic as today, never touching the network.
- Override `resolve(spec, context)` to gate on `(spec.namespace === "local" || spec.namespace === "preview")` and delegate to `super.resolve({ ...spec, namespace: "preview" }, context)`; return `undefined` for any other namespace.
- Register it via the public `TypstSnippet.withPackageRegistry(new VendoredPackageRegistry(accessModel, tarball))` static, which wraps the registry in the same provider shape `fetchPackageBy` returns. (Discovered at apply time: this static already exists, so hand-rolling the provider object with `withPackageRegistry` from `options.init` is unnecessary.) The `fs/package` import subpath is a public export of the pinned typst.ts version.

Why normalize to `preview` in the super call: the base `resolve` owns the untar, in-memory insertion, and caching logic, and its namespace check plus its cache key and extraction directory are all derived from the spec it receives. Handing it a `preview`-spelled spec reuses that logic verbatim, and both namespaces collapse onto one cache entry and one unpacked copy — the compiler consumes only the returned directory string, not the namespace embedded in it.

Alternative considered — implement `PackageRegistry` from scratch (~30 lines: untar via `context.untar`, insert into the access model, cache): rejected because it duplicates upstream logic the app would then have to keep correct (mtime handling, cache-closure semantics) for no behavioral gain. The subclass depends on `FetchPackageRegistry` internals, but typst.ts is pinned at 0.7.0 and the dependency is exercised on every page load, so drift would be caught immediately (see Risks).

### D2: Allowlist is namespace × name × version, checked in the app's overrides

The accepted set is exactly `{local, preview} × {armymemo} × {0.2.1}`. The name/version check lives in `pullPackageData` (as today) and the namespace check in `resolve`. Anything else returns `undefined`, which surfaces as the compiler's normal "package not found" diagnostic naming the package — preserving the typst-compilation spec's non-vendored-package scenario without new error paths. On a vendored-package bump, the version literal here changes alongside the example import and tarball, which the existing `check-acknowledgements` consistency check already polices for the tarball side.

### D3: `@local` becomes the taught form; `@preview` is compatibility, not documentation

`src/assets/example.typ` line 1 changes to `#import "@local/armymemo:0.2.1": memo`, and the README's package-bump instructions name `@local` as the canonical import while noting `@preview` remains accepted for existing documents. No draft migration: the memo-editor draft-persistence contract is that the editor restores exactly what the user typed, and `@preview` drafts keep compiling under D1. The starter example only appears when no usable draft exists, so returning users see no change until they clear their draft.

## Risks / Trade-offs

- [Subclass reaches into `FetchPackageRegistry` behavior (`resolve` delegation, feature-object shape)] → typst.ts is pinned at 0.7.0; both import subpaths are public exports; and the starter example compiles through this path on every page load and in the existing build-time checks, so an upgrade that breaks the contract fails loudly at dev time, not silently in production.
- [Two spellings for one package could drift into confusion (users unsure which is "real")] → Documentation and the example teach only `@local`; `@preview` is deliberately undocumented compatibility. If armymemo is ever published to Universe, `@preview` imports are already accepted and the preferred form can flip back by editing one example line and the README.
- [Namespace normalization stores the package under a `preview/…` in-memory path even for `@local` imports] → Cosmetic only: the path lives inside the in-memory access model and the compiler uses the returned directory handle; no user-visible surface exposes it. Accepted for the single-unpack benefit.
- [Users may now author `@local/<other-package>` imports expecting local-package support] → Out of scope by design; the failure diagnostic names the package, matching the existing non-vendored contract.
