# local-delivery

## Purpose

The static, local-only delivery model for memo.army.dev — self-contained bundle, no runtime network dependencies, no data leaving the browser.

**Status: implemented and enforced.** This capability is constraint-shaped, so its implementation lives in build machinery and automated checks rather than a feature module in `src/`:

- *Self-contained static bundle* — vendored assets (`vendor/`, `src/assets/fonts/`) and the Vite build (`vite.config.ts`, `assetsInlineLimit: 0`); browser verification suites exercise the app from a bare static file server.
- *No runtime network traffic beyond own origin* — the `injectProductionCsp` plugin in `vite.config.ts` plus `scripts/check-local-only.mjs`, which fails `npm run build` on any external-origin reference in `dist/`.
- *Local development workflow* — the `dev`/`build`/`preview` scripts in `package.json`, documented in `README.md`.
- *Offline availability after first visit* — `scripts/generate-sw.mjs` (build-generated service worker), `scripts/check-precache.mjs` (build-failing completeness check), and the production-only registration plus update-button wiring in `src/main.ts` (waiting-worker detection, `SKIP_WAITING` promotion, single reload on `controllerchange`); verified with the network fully unreachable.
- *Static-host per-file size limit* — `scripts/check-asset-size.mjs`, which fails `npm run build` on any `dist/` file of 25 MiB or larger, and the `compressCompilerWasm` plugin in `vite.config.ts`, which ships the Typst compiler WASM compressed for in-browser decoding.

Hosting the built `dist/` at memo.army.dev over https is deliberately outside this spec's scope: the requirements are written against "any plain static file server" so the contract is provable without reference to any particular host.
## Requirements
### Requirement: Self-contained static bundle
The production build SHALL emit a static bundle (`dist/`) containing every asset the app needs at runtime, and the app SHALL function when that bundle is served by any plain static file server with no server-side logic. Opening the bundle via `file://` is explicitly out of scope.

#### Scenario: Serve from a trivial static server
- **WHEN** the `dist/` output is served by a plain static file server (e.g., `python -m http.server`) and the page is loaded
- **THEN** the app loads and is fully functional using only assets from that server

#### Scenario: Build is reproducible from a clean checkout
- **WHEN** a clean checkout is built with the documented install and build commands
- **THEN** the build succeeds and produces the complete static bundle without requiring any services beyond the package registry at build time

### Requirement: No runtime network traffic beyond own origin
At runtime the app SHALL make no network requests to any origin other than the one serving its own static assets: no CDNs, no analytics, no telemetry, and no transmission of document contents. This SHALL be enforced by a Content-Security-Policy that restricts loading to `'self'` (with only the minimal additional directives the bundled assets require) and verified by an automated build-time check that fails when `dist/` references an external origin. The build-time check MAY exempt documented, never-fetched textual references — quoted URLs inside license texts on the acknowledgements page and navigation-only hyperlinks — provided each exemption carries a written rationale and the Content-Security-Policy plus browser-level same-origin assertions remain in force as the live enforcement.

#### Scenario: Browser blocks foreign origins
- **WHEN** the app runs with its delivered Content-Security-Policy
- **THEN** any request to a non-self origin is blocked by the browser

#### Scenario: Build check catches external references
- **WHEN** a build artifact in `dist/` outside the documented exemptions contains a reference to an external `http(s)://` origin
- **THEN** the local-only build check fails and reports the offending file and reference

#### Scenario: License texts do not fail the build
- **WHEN** the acknowledgements page in `dist/` quotes URLs inside license texts (e.g., `www.apache.org/licenses/`, `fsf.org`)
- **THEN** the local-only build check passes, and those URLs are never fetched at runtime

#### Scenario: Document contents stay local
- **WHEN** the user edits memo source in the app
- **THEN** no request containing any part of the document leaves the browser

### Requirement: Local development workflow
The repository SHALL provide documented commands for local development with hot reload, production build, and previewing the production build locally.

#### Scenario: Developer runs the app locally
- **WHEN** a developer runs the documented dev command after installing dependencies
- **THEN** a local dev server serves the app with hot reload on source changes

#### Scenario: Developer previews the production bundle
- **WHEN** a developer runs the documented build and preview commands
- **THEN** the exact production bundle from `dist/` is served locally for inspection

### Requirement: Offline availability after first visit
When served over a secure context (https or localhost), the app SHALL register a same-origin service worker that precaches the complete production bundle during the first visit, and SHALL thereafter load and function fully — editing, compiling, signature-field application, preview, and download — with no network connectivity. The precache asset list SHALL be generated from the actual build output, and the build SHALL fail if any file in `dist/` is not covered by it. After a redeploy, an online visit SHALL fetch and precache the new version in the background without disturbing the running page; once the new version is fully precached, the app SHALL reveal an update control, and activating that control SHALL switch to the new version by promoting the new service worker and reloading the page exactly once. The app SHALL NOT reload the page or switch versions without the user activating the control, and the control SHALL NOT appear on a first visit's initial install. The app SHALL be installable as a standalone app via a web application manifest with a same-origin icon.

#### Scenario: App works offline after one visit
- **WHEN** a user loads the app once over a secure context, the service worker finishes precaching, and the browser then goes fully offline
- **THEN** reloading the page presents the working app, and compiling and downloading a signable PDF succeed using only cached same-origin assets

#### Scenario: Precache completeness is build-enforced
- **WHEN** a production build produces a file in `dist/` that the service worker's precache list does not cover
- **THEN** the build fails, naming the uncovered file

#### Scenario: Redeploy surfaces an update control
- **WHEN** a new version is deployed and a user with the old version cached visits or refreshes while online
- **THEN** the new version is fetched and precached in the background, the running page continues on the cached version undisturbed, and an update control becomes visible once the new version is ready

#### Scenario: User applies the update
- **WHEN** the update control is visible and the user activates it
- **THEN** the new service worker takes control, the page reloads exactly once, and subsequent loads — including offline loads — serve the new version

#### Scenario: No unsolicited reload
- **WHEN** a new version finishes installing while the user is working in the app
- **THEN** the page does not reload, navigate, or switch versions until the user activates the update control

#### Scenario: First visit shows no update control
- **WHEN** a user visits for the first time and the initial service worker installs and precaches the bundle
- **THEN** no update control appears

#### Scenario: Installable manifest
- **WHEN** the app is served in production
- **THEN** it exposes a valid web application manifest and same-origin icon suitable for standalone installation

#### Scenario: Offline machinery is same-origin only
- **WHEN** the service worker installs, serves, or updates content
- **THEN** every fetched or cached URL is on the app's own origin

### Requirement: Support for URL-canonicalizing static hosts
When the serving host redirects between the `.html` and extensionless ("pretty") forms of a page URL, the service worker SHALL still deliver full offline and online function: responses stored during precache SHALL be usable for navigation responses (a response carrying the redirect flag SHALL never be served to a navigation), and a navigation to either URL form of a precached HTML page SHALL be served that page rather than the app shell. Behavior on hosts that serve every URL directly SHALL be unchanged, and a precache fetch that fails or returns a non-OK status SHALL still fail the entire install.

#### Scenario: Precached page serves on a redirecting host
- **WHEN** the host 308-redirects `/acknowledgements.html` to `/acknowledgements` and a user with the worker installed navigates to `/acknowledgements.html`
- **THEN** the acknowledgements page renders in every engine, with no redirected-response navigation error (e.g. WebKit's "Response served by service worker has redirections")

#### Scenario: Pretty URL serves the precached page
- **WHEN** a user navigates to the extensionless form of a precached HTML page (e.g. `/acknowledgements`), online or offline
- **THEN** that page is served — not the `/` app shell

#### Scenario: Plain hosts are unaffected
- **WHEN** the bundle is served by a plain static file server that never redirects
- **THEN** precaching, navigation, and offline behavior are identical to the previous worker

#### Scenario: Partial precache still fails install
- **WHEN** any precache asset fetch fails or returns a non-OK status during install
- **THEN** the install fails as a whole and no partial cache is activated

### Requirement: Static-host per-file size limit
Every file in the production bundle (`dist/`) SHALL be smaller than 25 MiB (26,214,400 bytes), so the bundle can be uploaded to static hosts that enforce a per-file size cap (such as Cloudflare). Assets whose raw form exceeds the limit SHALL be shipped in a compressed encoding that the app decodes in the browser at load time, without introducing any non-self-origin request and without depending on host-specific serving behavior (such as `Content-Encoding` headers) that a plain static file server would not provide. This SHALL be enforced by an automated build-time check that fails the build and names each offending file and its size.

#### Scenario: Build fails on an oversized file
- **WHEN** a production build emits a file in `dist/` of 25 MiB or larger
- **THEN** the build fails, and the check's output names the offending file and its size

#### Scenario: Bundle deploys within the cap
- **WHEN** the production bundle is built
- **THEN** every file in `dist/` — including the Typst compiler WASM, shipped compressed — is under 25 MiB

#### Scenario: Compressed assets work from a plain static server
- **WHEN** the bundle is served by a plain static file server with no special header configuration and the user compiles a memo
- **THEN** the app loads the compressed compiler asset from the app's own origin, decodes it in the browser, and compilation succeeds exactly as with an uncompressed asset

### Requirement: Pre-packaged self-hosting archive
Continuous integration SHALL build the site from a clean checkout using the documented build (including all of its build-failing checks) and SHALL package the complete static bundle into a zip archive containing the site files, self-hosting instructions, and build provenance (source commit, and tag when present). Pushes to the default branch SHALL publish the archive as a workflow artifact; version tags SHALL additionally attach it to a GitHub release. Serving the unpacked site files at the root of an origin with any plain static file server SHALL yield the fully functional app, identical in behavior to a locally built `dist/`.

#### Scenario: Default-branch push produces a downloadable archive
- **WHEN** a commit is pushed to the default branch
- **THEN** the workflow builds the site with the documented build command, all checks pass, and the resulting zip is available as a workflow artifact

#### Scenario: Version tag produces a release asset
- **WHEN** a version tag is pushed
- **THEN** a GitHub release for that tag carries the zip as a downloadable asset

#### Scenario: Unpacked archive serves the working app
- **WHEN** the zip is unpacked and its site directory is served at the origin root by a plain static file server (e.g., `python -m http.server`)
- **THEN** the app loads and is fully functional using only assets from that server

#### Scenario: Archive documents its own use and origin
- **WHEN** the zip is unpacked
- **THEN** it contains self-hosting instructions (serve at origin root; https or localhost required for offline support; `file://` unsupported) and the source commit the site was built from

#### Scenario: Failing checks block publication
- **WHEN** any build-failing check (typecheck, local-only, precache, asset-size) fails in the workflow
- **THEN** no archive is published for that run

