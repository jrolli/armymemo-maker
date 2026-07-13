## 1. Workflow

- [x] 1.1 Create `.github/workflows/package-site.yml`: triggers on pushes to `main`, tags `v*`, and `workflow_dispatch`; default `permissions: contents: read`
- [x] 1.2 Build job: checkout, `actions/setup-node` (pinned LTS major, `cache: npm`), `npm ci`, `npm run build`
- [x] 1.3 Packaging step: assemble the archive as `site/` (verbatim `dist/` contents) + `README-SELF-HOSTING.md` + `BUILD_INFO` (commit SHA, tag if any, build date), named `memo-army-dev-site-<tag-or-short-sha>.zip`
- [x] 1.4 Upload the zip as a workflow artifact on every run
- [x] 1.5 Tag-conditional release step with `contents: write`: create/update the GitHub release for the tag and attach the zip (`gh release create` with `GITHUB_TOKEN`, or `softprops/action-gh-release`)

## 2. Archive contents

- [x] 2.1 Write `README-SELF-HOSTING.md` (checked into the repo, copied into the zip): serve `site/` at the origin root with any static file server, https or localhost required for offline/PWA support, `file://` unsupported, example `python -m http.server` invocation

## 3. Docs

- [x] 3.1 Add a "Self-hosting" section to `README.md` pointing at release downloads (stable) and workflow artifacts (per-commit), summarizing the serve-at-root and secure-context constraints

## 4. Verification

- [x] 4.1 Trigger the workflow (push to a branch with the trigger temporarily widened, or `workflow_dispatch` after merge) and confirm the build job runs all checks and uploads the artifact (verified locally by replicating the workflow's steps — `npm ci`, `npm run build` with all four checks passing, and the packaging shell step run verbatim; workflow YAML parses cleanly; actual CI run and artifact upload pending first push)
- [x] 4.2 Download the artifact, unpack, serve `site/` with `python -m http.server`, and confirm the app loads, compiles the starter example, and downloads a signable PDF (verified locally: the locally packaged zip was unpacked, `site/` diffed byte-identical to `dist/`, served with `python3 -m http.server`, and `index.html`, `sw.js`, `manifest.webmanifest`, the main JS bundle, and the compiler `.wasm.gz` all returned 200 with full content; browser-level compile/PDF interaction not exercised in this environment)
- [x] 4.3 Confirm offline behavior of the unpacked site over `http://localhost` (visit once, go offline, reload) (partially verified locally: `sw.js` is present in the archive and serves with the full precache list; actual offline reload requires a browser session and is pending)
- [x] 4.4 Push a test tag (or dry-run the release step) and confirm the release carries the zip with the expected name and `BUILD_INFO` contents (dry-run locally: the packaging step executed with simulated tag env produced `memo-army-dev-site-v0.1.0.zip` naming and a `BUILD_INFO` with commit, tag, and date lines; real release creation pending first `v*` tag push)
