## Context

`npm run build` already produces a fully self-contained `dist/` and fails on any violated invariant (typecheck, `check:local-only`, `check:precache`, `check:asset-size`). The local-delivery spec guarantees the bundle works from "any plain static file server" and that a clean checkout builds needing only the npm registry — exactly what a CI runner provides. There is currently no `.github/` directory; this is the repo's first workflow. Relevant constraints on the served result: Vite builds with the default base `/` (absolute asset URLs) and the service worker registers at scope `/`, so the site must be served at an origin root; offline/PWA behavior needs a secure context.

## Goals / Non-Goals

**Goals:**
- One-download self-hosting: fetch zip → unpack → serve statically.
- A stable, login-free download URL (release assets) plus per-commit artifacts for `main`.
- Publish nothing unless every existing build check passes.

**Non-Goals:**
- Deploying memo.army.dev itself (hosting is explicitly outside the local-delivery spec's scope).
- Changing the build output, adding a relative-base (`./`) build variant, or supporting subpath hosting.
- Signed/reproducible-bit-for-bit archives, checksums beyond the commit provenance, or package-registry distribution.

## Decisions

**D1 — One workflow, two publication channels.**
`.github/workflows/package-site.yml` triggers on pushes to `main`, on tags matching `v*`, and on `workflow_dispatch`. A single build job runs `npm ci` + `npm run build` and always uploads the zip as a workflow artifact; a release step (conditional on a tag ref) attaches the same zip to a GitHub release. Alternatives considered: committing the zip to the repo (bloats history), GitHub Pages (a hosting concern, and doesn't give a downloadable bundle) — rejected.

**D2 — Zip layout: `site/` + docs at the archive root.**
The archive contains `site/` (the untouched `dist/` contents), `README-SELF-HOSTING.md`, and `BUILD_INFO` (commit SHA, tag if any, build date). Docs live *beside* the site directory, not inside it, so `dist/` stays byte-identical to a local build and the precache manifest, local-only scan, and asset-size checks are untouched — nothing is injected into `dist/` after its checks ran. Alternative — zip `dist/` contents at the archive root with the README mixed in: rejected; the README would become a served, non-precached file and muddy the "serve exactly this directory" instruction.

**D3 — Serve-at-root is documented, not engineered around.**
`README-SELF-HOSTING.md` states the three real constraints: serve `site/` at the root of an origin (absolute `/` asset URLs and service-worker scope), use https or localhost for offline support, and don't open via `file://`. Switching Vite to a relative base to allow subpath hosting was considered and rejected: it complicates worker/service-worker URL resolution for a marginal use case, and the existing spec is already written against origin-root serving.

**D4 — Pin the toolchain and the actions.**
`actions/setup-node` with an explicit current-LTS major and `cache: npm`; `npm ci` against the committed lockfile. Third-party actions pinned by major version at minimum (checkout, setup-node, upload-artifact; release via `softprops/action-gh-release` or plain `gh release create` with the built-in `GITHUB_TOKEN` — implementer's choice, `gh` avoids a third-party dependency). Workflow `permissions` default to `contents: read`, elevated to `contents: write` only for the tag-triggered release step.

**D5 — Naming: `memo-army-dev-site-<version>.zip`.**
`<version>` is the tag name for tag builds, otherwise the short commit SHA. The name matches the npm package name and makes provenance visible before unpacking; `BUILD_INFO` repeats it authoritatively inside.

## Risks / Trade-offs

- [CI Node version drifts from local dev and builds diverge] → The workflow pins the Node major; bumping it is a reviewed diff. The build's own checks gate publication either way.
- [Workflow artifacts expire and require a GitHub login] → That channel is for per-commit/testing use; the durable, anonymous channel is release assets on tags.
- [Zip is ~15 MB+ (compiler WASM dominates, already gzipped so it won't compress further)] → Acceptable for a one-time download; no action needed.
- [Users serve `site/` under a subpath and report breakage] → README-SELF-HOSTING states the origin-root requirement up front; this is a documented constraint, not a bug.

## Open Questions

- Whether tag pushes should also run a browser-level smoke test (Playwright against the unpacked archive) before releasing. The existing build checks already gate publication; a smoke test is a possible follow-up, not a blocker.
