# local-delivery (delta)

## MODIFIED Requirements

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
