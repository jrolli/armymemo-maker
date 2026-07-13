# pdf-output

## Purpose

Presenting the compiled result — in-page PDF preview and download of the produced PDF (signable when signature fields were applied, otherwise plain) with a sensible filename.
## Requirements
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
After a successful compile, the Download action SHALL be enabled and SHALL save the output PDF — the signable PDF when signature fields were applied, otherwise the plain compiled PDF. The saved filename SHALL be derived from the memo's subject as found in the source snapshot that produced the PDF: the subject text sanitized for filesystem safety (characters not permitted in common filesystems removed, whitespace collapsed and trimmed, length bounded) with a `.pdf` extension. When no non-empty subject can be determined from that source, the filename SHALL fall back to `memo.pdf`. The UI SHALL indicate which variant (signable or plain) the user is getting via the field status line. Before the first successful compile, Download SHALL remain disabled.

#### Scenario: Download saves the signable PDF when fields exist
- **WHEN** the user activates Download after a successful compile whose manifest was applied by esign
- **THEN** the browser saves a PDF containing the signature form fields, and the field status indicates a signable PDF

#### Scenario: Download saves the plain PDF when no fields exist
- **WHEN** the user activates Download after a successful compile of a document with no signature fields
- **THEN** the browser saves the plain compiled PDF and the field status indicates a plain (non-signable) PDF

#### Scenario: Filename derives from the memo subject
- **WHEN** the user activates Download after successfully compiling the starter example (subject "Weekly Training Meeting Minutes")
- **THEN** the browser saves the file as `Weekly Training Meeting Minutes.pdf`

#### Scenario: Unsafe characters are sanitized
- **WHEN** the compiled memo's subject contains characters unsafe in filenames (e.g., `Results: FY26 "Budget" Review?`)
- **THEN** the saved filename contains the subject with those characters removed or replaced, ends in `.pdf`, and contains no path separators, control characters, or characters rejected by common filesystems

#### Scenario: Missing subject falls back to memo.pdf
- **WHEN** the user activates Download after successfully compiling source whose subject is absent, empty, or cannot be determined
- **THEN** the browser saves the file as `memo.pdf`

#### Scenario: Filename tracks the downloaded content
- **WHEN** the user compiles a memo with subject A, edits the subject to B, recompiles successfully, and activates Download
- **THEN** the saved filename derives from subject B — the filename always reflects the source snapshot that produced the downloaded bytes

#### Scenario: Download disabled before any successful compile
- **WHEN** the page has loaded and no compile has succeeded yet
- **THEN** the Download action is disabled

