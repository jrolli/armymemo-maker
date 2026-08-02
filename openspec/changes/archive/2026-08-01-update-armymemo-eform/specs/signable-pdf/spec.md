# signable-pdf (delta)

## RENAMED Requirements

- FROM: `### Requirement: Signature fields applied via esign`
- TO: `### Requirement: Form fields applied via eform`

- FROM: `### Requirement: Plain-PDF fallback on esign failure`
- TO: `### Requirement: Plain-PDF fallback on eform failure`

- FROM: `### Requirement: Vendored esign module`
- TO: `### Requirement: Vendored eform module`

## MODIFIED Requirements

### Requirement: Form fields applied via eform
When a compile succeeds and yields a valid, non-empty field manifest, the app SHALL produce a signable PDF by applying the manifest to the compiled PDF with the vendored eform WASM module, entirely in the browser. The resulting document SHALL contain one form field per manifest entry — an unsigned signature field, a text field, or a checkbox per the entry's type — named and positioned per the manifest, with per-type options (including a signature entry's `lock` directive) carried into the PDF by eform.

#### Scenario: Starter example produces a signable PDF
- **WHEN** the user compiles the pre-filled starter example and downloads the result
- **THEN** the downloaded PDF contains an interactive form with an unsigned signature field for each extracted manifest entry (including one named `Signature`)

#### Scenario: Field application is local
- **WHEN** eform runs
- **THEN** no network requests occur beyond the app's own static assets (including the eform WASM)

### Requirement: Plain-PDF fallback on eform failure
If eform fails (throws) for a compiled document, the app SHALL keep the plain compiled PDF as the output for preview and download and SHALL report the eform error visibly in the field status area. The user SHALL never be left without a downloadable document because field application failed.

#### Scenario: eform error falls back to plain PDF
- **WHEN** eform rejects an otherwise-valid manifest (e.g., a field whose page exceeds the document's page count)
- **THEN** the field status reports the eform error and indicates the download is the plain PDF, and preview/download of the plain compiled PDF still work

### Requirement: Vendored eform module
The eform WASM module SHALL be vendored in the repository as artifacts built from a pinned commit of github.com/jrolli/eform by a maintenance script, served same-origin, and initialized lazily on first use. Regenerating the artifacts SHALL be an explicit script action, never part of the app build. The upstream license text SHALL be vendored alongside the built artifacts (`vendor/eform/LICENSE`) and refreshed by the same maintenance script whenever the pinned commit changes.

#### Scenario: App builds and runs offline with vendored eform
- **WHEN** the app is built from a clean checkout and served with no network access beyond the static server
- **THEN** signable PDFs are produced using only the vendored eform artifacts

#### Scenario: Vendored artifacts carry the upstream license
- **WHEN** the maintenance script regenerates `vendor/eform/` from the pinned commit
- **THEN** `vendor/eform/LICENSE` contains the upstream eform license text (AGPL-3.0-or-later) from that commit
