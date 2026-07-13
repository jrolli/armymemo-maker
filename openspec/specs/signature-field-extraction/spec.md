# signature-field-extraction

## Purpose

Querying `<esign-field>` metadata from the compiled document, producing a validated esign-compatible field manifest, and reporting detected fields (or their absence) to the user.

## Requirements

### Requirement: Field manifest extraction after successful compile
After every successful compile, the app SHALL query the compiled document for `<esign-field>` metadata using the same compilation inputs that produced the PDF, and SHALL assemble the results into a field manifest of `{name, page, x, y, w, h}` entries (PDF points, top-left origin, 1-indexed pages) suitable for esign.

#### Scenario: Fields extracted from the starter example
- **WHEN** the user compiles the pre-filled starter example
- **THEN** the app produces a manifest containing the memo's signature field(s) with the expected names and plausible geometry (page ≥ 1, positive width and height)

#### Scenario: Extraction is local
- **WHEN** extraction runs
- **THEN** no network requests beyond the app's own static assets occur

### Requirement: Manifest validation
The app SHALL validate the extracted manifest — non-empty unique names, integer page ≥ 1, finite coordinates, positive width and height — and SHALL discard an invalid manifest while reporting the problem and the offending field visibly. An extraction or validation failure SHALL NOT invalidate the successful compile: the PDF preview and plain download remain available.

#### Scenario: Duplicate field names rejected visibly
- **WHEN** a compiled document emits two `<esign-field>` entries with the same name
- **THEN** the field status reports the duplicate-name problem naming the field, no manifest is retained, and the compiled PDF remains previewable and downloadable

### Requirement: Field status reporting
After each successful compile, the app SHALL report the detected signature fields (count and names). A document with zero fields SHALL be reported as valid but producing a non-signable PDF. The report SHALL always reflect the most recent compile.

#### Scenario: Fields reported after compile
- **WHEN** a compile succeeds with signature fields present
- **THEN** the UI shows the field count and the field names from that compile

#### Scenario: Zero fields flagged
- **WHEN** a compile succeeds for a document emitting no `<esign-field>` metadata
- **THEN** the UI states that no signature fields were found and the output will be a plain (non-signable) PDF

#### Scenario: Report tracks the latest compile
- **WHEN** the user compiles a document with fields and then compiles a different document without fields
- **THEN** the report shows the zero-field message, not the stale field list
