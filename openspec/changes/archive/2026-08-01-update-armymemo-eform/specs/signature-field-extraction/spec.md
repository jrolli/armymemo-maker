# signature-field-extraction (delta)

## MODIFIED Requirements

### Requirement: Field manifest extraction after successful compile
After every successful compile, the app SHALL query the compiled document for `<eform-field>` metadata using the same compilation inputs that produced the PDF, and SHALL assemble the results into a field manifest suitable for eform: an array of entries carrying the common placement keys `{name, page, x, y, w, h}` (PDF points, top-left origin, 1-indexed pages), an optional `type` key (`"signature"`, `"text"`, or `"checkbox"`; absent means signature), and any per-type option keys (e.g. a signature entry's `lock`). Extracted entries SHALL be passed to eform verbatim — keys beyond the common placement keys SHALL be preserved, not stripped, since eform is the authority on per-type schema validity.

#### Scenario: Fields extracted from the starter example
- **WHEN** the user compiles the pre-filled starter example
- **THEN** the app produces a manifest containing the memo's signature field(s) with the expected names and plausible geometry (page ≥ 1, positive width and height)

#### Scenario: Option keys survive extraction
- **WHEN** a compiled document emits a signature entry carrying a `lock` key
- **THEN** the manifest entry handed to eform still contains that `lock` key with its emitted value

#### Scenario: Extraction is local
- **WHEN** extraction runs
- **THEN** no network requests beyond the app's own static assets occur

### Requirement: Manifest validation
The app SHALL validate the common keys of the extracted manifest — non-empty unique names, integer page ≥ 1, finite coordinates, positive width and height, and, when a `type` key is present, one of the known type strings — and SHALL discard an invalid manifest while reporting the problem and the offending field visibly. Per-type option keys SHALL NOT be validated client-side; eform validates them at field application. An extraction or validation failure SHALL NOT invalidate the successful compile: the PDF preview and plain download remain available.

#### Scenario: Duplicate field names rejected visibly
- **WHEN** a compiled document emits two `<eform-field>` entries with the same name
- **THEN** the field status reports the duplicate-name problem naming the field, no manifest is retained, and the compiled PDF remains previewable and downloadable

#### Scenario: Unknown type rejected visibly
- **WHEN** a compiled document emits an entry whose `type` is not `"signature"`, `"text"`, or `"checkbox"`
- **THEN** the field status reports the unknown type naming the field, no manifest is retained, and the compiled PDF remains previewable and downloadable

### Requirement: Field status reporting
After each successful compile, the app SHALL report the detected form fields (count and names). A document with zero fields SHALL be reported as valid but producing a non-signable PDF. The report SHALL always reflect the most recent compile.

#### Scenario: Fields reported after compile
- **WHEN** a compile succeeds with form fields present
- **THEN** the UI shows the field count and the field names from that compile

#### Scenario: Zero fields flagged
- **WHEN** a compile succeeds for a document emitting no `<eform-field>` metadata
- **THEN** the UI states that no form fields were found and the output will be a plain (non-signable) PDF

#### Scenario: Report tracks the latest compile
- **WHEN** the user compiles a document with fields and then compiles a different document without fields
- **THEN** the report shows the zero-field message, not the stale field list
