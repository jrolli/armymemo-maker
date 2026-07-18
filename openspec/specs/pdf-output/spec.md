# pdf-output

## Purpose

Presenting the compiled result — in-page PDF preview and download of the produced PDF with a sensible filename.

## Requirements

### Requirement: PDF preview of the compiled memo
After a successful compile, the output pane SHALL display the compiled PDF (replacing the empty state or any prior result), rendered from the same bytes the user would download. Resources backing a replaced preview SHALL be released.

#### Scenario: Preview appears after compile
- **WHEN** a compile succeeds
- **THEN** the output pane displays the compiled PDF document in place of the empty-state message

#### Scenario: Preview tracks the latest compile
- **WHEN** the user edits the source and compiles again successfully
- **THEN** the output pane shows the new result and the previous preview's object URL is revoked

### Requirement: Download of the compiled PDF
After a successful compile, the Download action SHALL be enabled and SHALL save the compiled PDF bytes as a file named `memo.pdf`. Before the first successful compile, and while the current source has never compiled successfully, Download SHALL remain disabled.

#### Scenario: Download saves the compiled PDF
- **WHEN** the user activates Download after a successful compile
- **THEN** the browser saves a file `memo.pdf` whose bytes are exactly the most recent successful compile's PDF output

#### Scenario: Download disabled before any successful compile
- **WHEN** the page has loaded and no compile has succeeded yet
- **THEN** the Download action is disabled
