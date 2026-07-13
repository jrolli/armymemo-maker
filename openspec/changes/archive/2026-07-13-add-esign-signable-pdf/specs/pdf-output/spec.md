# pdf-output

## MODIFIED Requirements

### Requirement: PDF preview of the compiled memo
After a successful compile, the output pane SHALL display the output PDF — the signable PDF when signature fields were applied, otherwise the plain compiled PDF — replacing the empty state or any prior result, rendered from the same bytes the user would download. Resources backing a replaced preview SHALL be released.

#### Scenario: Preview appears after compile
- **WHEN** a compile succeeds
- **THEN** the output pane displays the output PDF document in place of the empty-state message

#### Scenario: Preview tracks the latest compile
- **WHEN** the user edits the source and compiles again successfully
- **THEN** the output pane shows the new result and the previous preview's object URL is revoked

#### Scenario: Preview and download bytes agree
- **WHEN** a compile succeeds with signature fields applied
- **THEN** the preview renders the same signable bytes that Download saves

### Requirement: Download of the compiled PDF
After a successful compile, the Download action SHALL be enabled and SHALL save the output PDF — the signable PDF when signature fields were applied, otherwise the plain compiled PDF — as a file named `memo.pdf`. The UI SHALL indicate which variant (signable or plain) the user is getting via the field status line. Before the first successful compile, Download SHALL remain disabled.

#### Scenario: Download saves the signable PDF when fields exist
- **WHEN** the user activates Download after a successful compile whose manifest was applied by esign
- **THEN** the browser saves `memo.pdf` containing the signature form fields, and the field status indicates a signable PDF

#### Scenario: Download saves the plain PDF when no fields exist
- **WHEN** the user activates Download after a successful compile of a document with no signature fields
- **THEN** the browser saves the plain compiled `memo.pdf` and the field status indicates a plain (non-signable) PDF

#### Scenario: Download disabled before any successful compile
- **WHEN** the page has loaded and no compile has succeeded yet
- **THEN** the Download action is disabled
