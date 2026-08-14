## Why

armymemo has never been published to Typst Universe, so the `@preview/armymemo` import the app teaches is a fiction: `@preview` denotes the Universe registry, while `@local` is Typst's conventional namespace for packages installed outside it. Users who author memos on their own machines against a locally installed armymemo write `@local/armymemo:0.2.1`, and today those files fail on this site — the resolver only answers to `@preview`. Accepting both namespaces makes locally authored files work as-is, and switching the starter example to `@local` makes the preferred, honest form the one users learn.

## What Changes

- The in-browser compiler resolves the vendored armymemo package under **both** `@local/armymemo:0.2.1` and `@preview/armymemo:0.2.1`. Existing saved drafts and previously shared documents (which use `@preview`) keep compiling unchanged.
- `@local` becomes the documented, preferred namespace: the starter example document's import line changes from `@preview/armymemo:0.2.1` to `@local/armymemo:0.2.1`, and the README's vendoring/bump instructions follow.
- Non-vendored packages continue to fail with a diagnostic naming the unresolvable package, in either namespace — the local-only contract is unchanged; only the accepted namespaces for the one vendored package widen.
- No change to the vendored tarball, the vendor script, or the package payload: a Typst package archive does not encode a namespace, so `vendor/armymemo-0.2.1.tar.gz` serves both spellings.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `typst-compilation`: the "Offline armymemo package resolution" requirement changes from resolving only `@preview/armymemo:0.2.1` to resolving the vendored archive under both `@local/armymemo:0.2.1` (preferred) and `@preview/armymemo:0.2.1` (compatibility), still without contacting any registry.
- `memo-editor`: the "Starter example content" requirement changes so the pre-filled example's pinned import line uses the `@local` namespace instead of `@preview`.

## Impact

- `src/typst-service.ts`: the package-resolution wiring. The current `TypstSnippet.fetchPackageBy` helper builds on typst.ts's `FetchPackageRegistry`, whose `resolve()` hard-rejects every namespace except `preview` before the app's fetcher is consulted — so the app must register its own small package registry (via the exported `withPackageRegistry`) that accepts both namespaces for `armymemo@0.2.1` and unpacks the same vendored tarball.
- `src/assets/example.typ`: import line moves to `@local/armymemo:0.2.1`. This changes the starter content compiled on first visit and by the file-compile flow's example path, but not its behavior.
- `README.md`: package-bump instructions reference `@local` as the canonical import.
- Unaffected: `vendor/`, `scripts/vendor-armymemo.mjs`, eform integration, fonts, service worker, and the `file-compile-page`, `signable-pdf`, `signature-field-extraction`, `local-delivery`, `pdf-output`, and `acknowledgements` capabilities (none constrain the import namespace).
- Not breaking: `@preview` imports keep resolving, so existing localStorage drafts and user-held `.typ` files compile as before.
