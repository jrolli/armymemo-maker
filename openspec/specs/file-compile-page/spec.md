# file-compile-page Specification

## Purpose
TBD - created by archiving change add-file-compile-page. Update Purpose after archive.
## Requirements
### Requirement: File intake via drag-and-drop and browse
The app SHALL provide a conversion page containing a single file-intake area that accepts a memo source file — Typst, or a Markdown memo — two ways: by dragging a file from the operating system onto the area, and by activating the area (click or keyboard) to open the browser's file chooser. The intake SHALL accept exactly one file per gesture; when a drop contains multiple files, the page SHALL report the problem visibly and SHALL NOT compile. The file's bytes SHALL be read as UTF-8 text in the browser; the page SHALL NOT reject a file based on its name or extension — the extension selects the interpretation: files named `*.md` or `*.markdown` (case-insensitive) are treated as Markdown memos and converted to Typst before compilation, and all other files are treated as Typst source directly. The page copy SHALL state that both formats are accepted.

#### Scenario: Drop a Typst file
- **WHEN** the user drags a single `.typ` file onto the intake area and drops it
- **THEN** the page reads the file and begins compiling it

#### Scenario: Drop a Markdown memo
- **WHEN** the user drags a single `.md` file containing a valid Markdown memo onto the intake area and drops it
- **THEN** the page converts it to Typst and begins compiling the converted source

#### Scenario: Browse to a Typst file
- **WHEN** the user activates the intake area and selects a single file in the file chooser
- **THEN** the page reads the file and begins compiling it

#### Scenario: Multiple files dropped
- **WHEN** the user drops two or more files onto the intake area
- **THEN** the page reports that exactly one file is expected and does not compile

### Requirement: One-shot compile and download
On receiving a file, the page SHALL compile its contents to PDF with the same in-browser pipeline as the editor page — Markdown-to-Typst conversion first when the file is a Markdown memo, then Typst compilation, form-field extraction, and eform field application when a valid non-empty manifest exists — and, on success, SHALL immediately trigger a browser download of the output PDF without further user action. The output SHALL be the signable PDF when fields were applied, otherwise the plain compiled PDF, following the same fallback policy as the editor: eform failure or an invalid manifest downgrades to the plain PDF with a visible explanation, and zero fields yields the plain PDF. All work SHALL happen locally with no network requests beyond the app's own static assets.

#### Scenario: Valid memo with signature fields downloads signable PDF
- **WHEN** the user provides a valid armymemo source file whose compile yields a valid non-empty field manifest
- **THEN** the browser immediately downloads a PDF containing an unsigned signature form field per manifest entry, and the page indicates a signable PDF was produced

#### Scenario: Markdown memo downloads through the same pipeline
- **WHEN** the user provides a valid Markdown memo whose converted Typst compiles with a valid non-empty field manifest
- **THEN** the browser immediately downloads the signable PDF exactly as it would for the equivalent Typst source

#### Scenario: Memo without signature fields downloads plain PDF
- **WHEN** the user provides a valid Typst source file whose compile yields zero form fields
- **THEN** the browser immediately downloads the plain compiled PDF and the page states the result is non-signable

#### Scenario: eform failure still downloads the plain PDF
- **WHEN** field application fails for an otherwise successful compile
- **THEN** the browser downloads the plain compiled PDF and the page visibly reports the eform problem

### Requirement: Compile errors reported, nothing downloaded
When compilation fails — or, for a Markdown memo, when Markdown-to-Typst conversion fails — the page SHALL NOT trigger a download and SHALL display the diagnostics visibly: compiler diagnostics for compile failures, and the conversion error (missing or invalid front matter, missing required fields, or an unsupported Markdown construct with its location) for conversion failures. A subsequent successful conversion SHALL clear the previous error state.

#### Scenario: Invalid source shows diagnostics
- **WHEN** the user provides a file that is not valid Typst source
- **THEN** no download occurs and the page displays the compiler diagnostics

#### Scenario: Markdown conversion failure shows the conversion error
- **WHEN** the user provides a `.md` file whose front matter omits required memo fields
- **THEN** no download occurs and the page displays the conversion error listing the missing fields

#### Scenario: Recovery after an error
- **WHEN** a failed conversion is followed by a successful one
- **THEN** the error display is replaced by the success outcome and the new PDF downloads

### Requirement: Output filename derived from the source filename
The downloaded PDF SHALL be named after the provided file with its final extension replaced by `.pdf`; a source name without an extension SHALL gain `.pdf`. The stem SHALL be sanitized for filesystem safety (characters not permitted in common filesystems removed, whitespace collapsed and trimmed, length bounded); when sanitization leaves an empty stem, the filename SHALL fall back to `memo.pdf`.

#### Scenario: Extension replaced
- **WHEN** the user converts a file named `leave-request.typ`
- **THEN** the downloaded PDF is named `leave-request.pdf`

#### Scenario: Fallback on unusable name
- **WHEN** the provided file's name sanitizes to an empty stem
- **THEN** the downloaded PDF is named `memo.pdf`

### Requirement: Reachable from the landing page
The landing page SHALL contain a clearly labeled link to the conversion page, and the conversion page SHALL link back to the landing page.

#### Scenario: Landing page links to the conversion page
- **WHEN** the landing page loads
- **THEN** it contains a link that navigates to the conversion page

#### Scenario: Conversion page links back
- **WHEN** the conversion page loads
- **THEN** it contains a link that navigates back to the editor landing page

### Requirement: Delivered and cached like the rest of the app
The conversion page SHALL ship in the production bundle with the same Content-Security-Policy as every other page, SHALL be precached by the generated service worker, and SHALL function offline after the app has been visited once.

#### Scenario: Works offline
- **WHEN** the app has been visited once and the conversion page is opened with the network unreachable
- **THEN** the page loads from the precache and a dropped valid memo file compiles and downloads successfully

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
