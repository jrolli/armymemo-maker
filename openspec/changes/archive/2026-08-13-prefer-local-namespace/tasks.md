## 1. Dual-namespace package registry

- [x] 1.1 In `src/typst-service.ts`, define a `VendoredPackageRegistry` subclass of `FetchPackageRegistry` (imported from `@myriaddreamin/typst.ts/fs/package`): override `pullPackageData` to return the vendored armymemo tarball for `name === "armymemo" && version === "0.2.1"` and `undefined` otherwise, and override `resolve` to accept only the `local` and `preview` namespaces, delegating via `super.resolve({ ...spec, namespace: "preview" }, context)` (design D1/D2)
- [x] 1.2 Replace the `TypstSnippet.fetchPackageBy(...)` entry in the `$typst.use(...)` call with the public `TypstSnippet.withPackageRegistry(new VendoredPackageRegistry(accessModel, tarball))` static (which wraps the registry in the same provider shape); update the file's header comment to describe the dual-namespace contract
- [x] 1.3 Verify in the dev server that documents importing `@local/armymemo:0.2.1` and `@preview/armymemo:0.2.1` both compile, and that `@local/example:0.1.0` and `@preview/example:0.1.0` both fail with a diagnostic naming the package

## 2. Preferred-form surfaces

- [x] 2.1 Change the import line in `src/assets/example.typ` to `#import "@local/armymemo:0.2.1": memo` and confirm the starter example compiles on page load in the dev server (main page and the drop-a-file page's example path)
- [x] 2.2 Update the README package-bump instructions (around the `@preview/armymemo:0.2.1` mention) to name `@local` as the canonical import, noting that `@preview` remains accepted for existing documents and that other imports in either namespace still fail by design

## 3. Verification

- [x] 3.1 Confirm a draft saved with a `@preview` import is restored verbatim (not rewritten) and still compiles after the change
- [x] 3.2 Run `npm run build` and confirm it passes end to end (tsc, acknowledgements, local-only, precache, and asset-size checks) with no new network-reachable references introduced by the registry change
