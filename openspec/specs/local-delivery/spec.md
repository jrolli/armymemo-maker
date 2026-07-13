# local-delivery

## Purpose

The static, local-only delivery model for memo.army.dev — self-contained bundle, no runtime network dependencies, no data leaving the browser.
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
At runtime the app SHALL make no network requests to any origin other than the one serving its own static assets: no CDNs, no analytics, no telemetry, and no transmission of document contents. This SHALL be enforced by a Content-Security-Policy that restricts loading to `'self'` (with only the minimal additional directives the bundled assets require) and verified by an automated build-time check that fails when `dist/` references an external origin.

#### Scenario: Browser blocks foreign origins
- **WHEN** the app runs with its delivered Content-Security-Policy
- **THEN** any request to a non-self origin is blocked by the browser

#### Scenario: Build check catches external references
- **WHEN** a build artifact in `dist/` contains a reference to an external `http(s)://` origin
- **THEN** the local-only build check fails and reports the offending file and reference

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
When served over a secure context (https or localhost), the app SHALL register a same-origin service worker that precaches the complete production bundle during the first visit, and SHALL thereafter load and function fully — editing, compiling, signature-field application, preview, and download — with no network connectivity. The precache asset list SHALL be generated from the actual build output, and the build SHALL fail if any file in `dist/` is not covered by it. After a redeploy, the next online visit SHALL fetch the new version in the background and serve it from the following load, without user-facing update prompts. The app SHALL be installable as a standalone app via a web application manifest with a same-origin icon.

#### Scenario: App works offline after one visit
- **WHEN** a user loads the app once over a secure context, the service worker finishes precaching, and the browser then goes fully offline
- **THEN** reloading the page presents the working app, and compiling and downloading a signable PDF succeed using only cached same-origin assets

#### Scenario: Precache completeness is build-enforced
- **WHEN** a production build produces a file in `dist/` that the service worker's precache list does not cover
- **THEN** the build fails, naming the uncovered file

#### Scenario: Redeploy reaches users without prompts
- **WHEN** a new version is deployed and a user with the old version cached visits while online
- **THEN** the new version is fetched in the background and served on the following load, with no update prompt

#### Scenario: Installable manifest
- **WHEN** the app is served in production
- **THEN** it exposes a valid web application manifest and same-origin icon suitable for standalone installation

#### Scenario: Offline machinery is same-origin only
- **WHEN** the service worker installs, serves, or updates content
- **THEN** every fetched or cached URL is on the app's own origin

