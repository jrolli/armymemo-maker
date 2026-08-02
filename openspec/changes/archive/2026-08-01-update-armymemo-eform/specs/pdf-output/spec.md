# pdf-output (delta)

## MODIFIED Requirements

### Requirement: Download of the compiled PDF
After a successful compile, the Download action SHALL be enabled and SHALL save the output PDF — the signable PDF when form fields were applied, otherwise the plain compiled PDF. The saved filename SHALL be derived from the memo's subject as found in the source snapshot that produced the PDF: the subject text sanitized for filesystem safety (characters not permitted in common filesystems removed, whitespace collapsed and trimmed, length bounded) with a `.pdf` extension. When no non-empty subject can be determined from that source, the filename SHALL fall back to `memo.pdf`. The UI SHALL indicate which variant (signable or plain) the user is getting via the field status line. Before the first successful compile, Download SHALL remain disabled.

#### Scenario: Download saves the signable PDF when fields exist
- **WHEN** the user activates Download after a successful compile whose manifest was applied by eform
- **THEN** the browser saves a PDF containing the form fields, and the field status indicates a signable PDF

#### Scenario: Download saves the plain PDF when no fields exist
- **WHEN** the user activates Download after a successful compile of a document with no form fields
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
