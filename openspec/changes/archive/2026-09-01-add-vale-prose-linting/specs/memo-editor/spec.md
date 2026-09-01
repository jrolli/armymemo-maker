## ADDED Requirements

### Requirement: Prose findings display
The editor page SHALL display prose lint findings for each compile
snapshot in a dedicated findings area, distinct from the compile
diagnostics area and the field status line. Linting SHALL follow the same
cadence as compilation — the same debounced automatic trigger and manual
compile action, on the same source snapshot — and SHALL lint the source as
the user entered it: the Markdown text in Markdown mode and the Typst text
in Typst mode, never the converted Typst. The findings area SHALL be
replaced atomically per snapshot (findings from different snapshots are
never mixed), SHALL be hidden when the latest lint produced no findings,
and SHALL NOT affect the preview, download availability, or diagnostics
display in any compile outcome.

#### Scenario: Findings appear beside a successful compile
- **WHEN** the editor source compiles successfully and contains a wordy phrase
- **THEN** the preview and download behave as before this change, and the findings area lists the phrase's finding with its position

#### Scenario: Findings appear despite a failed compile
- **WHEN** the editor source fails to compile but its prose yields findings
- **THEN** the diagnostics area shows the compile failure exactly as before this change, and the findings area shows the prose findings

#### Scenario: Clean prose hides the findings area
- **WHEN** a snapshot's lint produces no findings
- **THEN** the findings area is hidden

#### Scenario: Markdown mode lints the Markdown
- **WHEN** Markdown mode is active and the body's line 7 contains a flagged phrase
- **THEN** the finding reports line 7, matching the visible Markdown text
