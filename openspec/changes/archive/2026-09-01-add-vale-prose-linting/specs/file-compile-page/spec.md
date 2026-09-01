## ADDED Requirements

### Requirement: Prose findings for converted files
The conversion page SHALL lint each received file's source text — as
Markdown for files interpreted as Markdown memos, as Typst otherwise —
and SHALL display the findings below the outcome status line after the
compile-and-download flow completes. The one-gesture behavior SHALL be
unchanged: the download (or the failure report) proceeds exactly as
without linting, regardless of lint findings, lint duration, or lint
failure. When the file fails to convert or compile, any prose findings
for its source SHALL still be displayed alongside the failure report.

#### Scenario: Download proceeds with findings shown
- **WHEN** the user drops a valid `.typ` memo whose prose contains a passive-voice phrase
- **THEN** the PDF downloads exactly as before this change, and the page then lists the prose finding with its position in the dropped file

#### Scenario: Clean file shows no findings
- **WHEN** the user drops a valid memo whose prose yields no findings
- **THEN** the outcome status is shown as before this change with no findings list

#### Scenario: Lint failure does not disturb conversion
- **WHEN** the prose check fails while a dropped file compiles successfully
- **THEN** the PDF downloads normally and the page notes the prose check is unavailable
