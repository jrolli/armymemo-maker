# local-delivery

## ADDED Requirements

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
