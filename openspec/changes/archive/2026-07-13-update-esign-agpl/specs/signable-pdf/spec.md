## MODIFIED Requirements

### Requirement: Vendored esign module
The esign WASM module SHALL be vendored in the repository as artifacts built from a pinned upstream commit by a maintenance script, served same-origin, and initialized lazily on first use. Regenerating the artifacts SHALL be an explicit script action, never part of the app build. The upstream license text SHALL be vendored alongside the built artifacts (`vendor/esign/LICENSE`) and refreshed by the same maintenance script whenever the pinned commit changes.

#### Scenario: App builds and runs offline with vendored esign
- **WHEN** the app is built from a clean checkout and served with no network access beyond the static server
- **THEN** signable PDFs are produced using only the vendored esign artifacts

#### Scenario: Vendored artifacts carry the upstream license
- **WHEN** the maintenance script regenerates `vendor/esign/` from the pinned commit
- **THEN** `vendor/esign/LICENSE` contains the upstream esign license text (AGPL-3.0-or-later) from that commit
