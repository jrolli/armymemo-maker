## Why

The app is deliberately hostable by "any plain static file server", but getting a servable `dist/` today requires a Node toolchain and running the build. A pre-packaged zip of the built site lets anyone — including AGPL users exercising their right to run their own instance — download, unpack, and serve, with no toolchain at all.

## What Changes

- New GitHub Actions workflow that builds the site from a clean checkout (`npm ci` + `npm run build`, which already runs the typecheck and all local-only/precache/asset-size checks) and packages the result into a zip.
- On every push to `main` (and on manual dispatch): the zip is uploaded as a workflow artifact.
- On version tags: a GitHub release is created with the zip attached, giving a stable, login-free download URL.
- The zip contains the site files plus a short self-hosting README (serve at the origin root, https or localhost for offline/PWA support, `file://` unsupported) and build provenance (commit, tag, date).
- `README.md` gains a "Self-hosting" section pointing at the release downloads.

No application code changes; the delivered bundle is byte-for-byte what `npm run build` produces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-delivery`: gains a requirement (ADDED in the delta) that CI publishes a pre-packaged archive of the built site — as a workflow artifact on `main` pushes and as a release asset on version tags — which, unpacked and served statically, yields the fully functional app.

## Impact

- New: `.github/workflows/package-site.yml`, a self-hosting README template packaged into the zip.
- Modified: `README.md`.
- No changes to `src/`, `vite.config.ts`, or any build script; the workflow consumes the existing `npm run build` contract (network only to the npm registry, per the existing "Build is reproducible from a clean checkout" scenario).
