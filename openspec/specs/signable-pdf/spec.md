# signable-pdf

## Purpose

Producing the field-bearing (signable) PDF via the vendored esign WASM module — initialization, invocation with the compiled PDF and field manifest, and error handling with plain-PDF fallback.

## Requirements

### Requirement: Signature fields applied via esign
When a compile succeeds and yields a valid, non-empty field manifest, the app SHALL produce a signable PDF by applying the manifest to the compiled PDF with the vendored esign WASM module, entirely in the browser. The resulting document SHALL contain one unsigned signature form field per manifest entry, named and positioned per the manifest.

#### Scenario: Starter example produces a signable PDF
- **WHEN** the user compiles the pre-filled starter example and downloads the result
- **THEN** the downloaded PDF contains an interactive form with an unsigned signature field for each extracted manifest entry (including one named `Signature`)

#### Scenario: Field application is local
- **WHEN** esign runs
- **THEN** no network requests occur beyond the app's own static assets (including the esign WASM)

### Requirement: Plain-PDF fallback on esign failure
If esign fails (throws) for a compiled document, the app SHALL keep the plain compiled PDF as the output for preview and download and SHALL report the esign error visibly in the field status area. The user SHALL never be left without a downloadable document because field application failed.

#### Scenario: esign error falls back to plain PDF
- **WHEN** esign rejects an otherwise-valid manifest (e.g., a field whose page exceeds the document's page count)
- **THEN** the field status reports the esign error and indicates the download is the plain PDF, and preview/download of the plain compiled PDF still work

### Requirement: Vendored esign module
The esign WASM module SHALL be vendored in the repository as artifacts built from a pinned upstream commit by a maintenance script, served same-origin, and initialized lazily on first use. Regenerating the artifacts SHALL be an explicit script action, never part of the app build. The upstream license text SHALL be vendored alongside the built artifacts (`vendor/esign/LICENSE`) and refreshed by the same maintenance script whenever the pinned commit changes.

#### Scenario: App builds and runs offline with vendored esign
- **WHEN** the app is built from a clean checkout and served with no network access beyond the static server
- **THEN** signable PDFs are produced using only the vendored esign artifacts

#### Scenario: Vendored artifacts carry the upstream license
- **WHEN** the maintenance script regenerates `vendor/esign/` from the pinned commit
- **THEN** `vendor/esign/LICENSE` contains the upstream esign license text (AGPL-3.0-or-later) from that commit
