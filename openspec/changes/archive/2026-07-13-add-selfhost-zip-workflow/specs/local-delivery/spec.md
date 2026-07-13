# local-delivery (delta)

## ADDED Requirements

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
