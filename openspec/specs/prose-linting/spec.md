# prose-linting

## Purpose

Advisory prose linting of memo sources with the real Vale engine running
in-browser — the vendored WASM engine and single bundled style, format
handling for Typst and Markdown sources, the never-blocking severity
policy, and the local-only execution contract enforced by the lint
worker's in-memory filesystem.
## Requirements
### Requirement: In-browser Vale lint engine
The app SHALL lint memo prose with the Vale lint engine executing entirely
in the browser as a WebAssembly module served from the app's own origin,
running in a dedicated Web Worker separate from the compile worker. The
engine's only filesystem access SHALL be an in-memory filesystem seeded
exclusively with the bundled Vale configuration, the bundled style files,
and the document under lint; no lint operation SHALL cause a network
request beyond fetching the app's own static assets, and document contents
SHALL NOT leave the browser.

#### Scenario: Lint runs locally
- **WHEN** a memo source is linted while the network allows only same-origin requests
- **THEN** the lint completes and yields findings using only assets served from the app's own origin

#### Scenario: Engine cannot read outside its seeded tree
- **WHEN** the lint engine attempts to access any path other than its bundled configuration, style files, or the document under lint
- **THEN** the access fails as nonexistent and the lint proceeds without it

#### Scenario: Lint does not occupy the compile pipeline
- **WHEN** a lint request and a compile request are issued for the same source snapshot
- **THEN** the compile proceeds in the compile worker unaffected by lint execution time or lint failure

### Requirement: Format-aware lint dispatch
The lint service SHALL accept a source text plus a format indicator and
lint Markdown sources as Markdown and Typst sources as Typst-associated
text: Typst input SHALL be lint-scoped through a format association with
bundled ignore patterns that exclude Typst markup constructs (import and
show-rule lines and code-mode calls) from prose analysis. In every case
the text linted SHALL be exactly the text the user provided — never
generated or converted source — so reported positions refer to the
user-visible document.

#### Scenario: Markdown memo is linted as Markdown
- **WHEN** a Markdown memo containing a prose issue in its body is linted as Markdown
- **THEN** a finding is reported whose line and column refer to that position in the Markdown text

#### Scenario: Typst markup is not flagged as prose
- **WHEN** a Typst memo whose preamble contains `#import` and `#show: memo.with(...)` lines is linted
- **THEN** no finding is produced whose match lies inside those markup constructs

#### Scenario: Typst prose is linted
- **WHEN** a Typst memo whose body contains a passive-voice phrase is linted as Typst
- **THEN** a finding for that phrase is reported at its position in the Typst source

### Requirement: Single bundled prose style
The app SHALL bundle exactly one prose style, vendored with the app's
static assets, providing general-purpose prose rules aligned with Army
plain-writing guidance: it SHALL include detection of passive voice,
wordy phrases, and weasel words, and substitution guidance for
plain-writing replacements; it SHALL NOT flag ordinary use of forms of
"to be" outside passive constructions. Every alert the engine emits at
any severity SHALL be surfaced to the user; severity SHALL affect only
labeling, never visibility.

#### Scenario: Wordy phrase is flagged with a replacement
- **WHEN** a memo body contains "in accordance with"
- **THEN** a finding suggests a plainer substitute

#### Scenario: Suggestion-level alerts are shown
- **WHEN** the engine emits an alert whose severity is the lowest it produces
- **THEN** the alert appears in the displayed findings

#### Scenario: Simple copula is not flagged
- **WHEN** a memo body contains "The suspense date is 15 September 2026." with no passive construction
- **THEN** no finding is produced for the word "is"

### Requirement: Advisory-only severity policy
Prose lint findings SHALL be strictly advisory: no finding, any number of
findings, a lint that has not finished, or a lint failure of any kind
SHALL ever prevent, delay, or alter compilation, field extraction,
signable-PDF production, preview, or download. A lint failure SHALL
degrade to a visible note that the prose check is unavailable, displayed
in the findings area and never among compile diagnostics, and the lint
service SHALL recover such that a subsequent request can succeed.

#### Scenario: Findings do not block the PDF
- **WHEN** a memo compiles successfully and its prose yields findings
- **THEN** the PDF output, preview, and download behave exactly as they would with zero findings

#### Scenario: Lint failure degrades quietly
- **WHEN** the lint engine crashes or returns unreadable output for a request
- **THEN** the findings area shows that the prose check is unavailable, compile diagnostics are unaffected, and a later lint request is attempted afresh

### Requirement: Finding content
Each displayed finding SHALL present the alert's position (line and column
in the user's source), its severity label, its message, and the
identifier of the rule that produced it.

#### Scenario: Finding shows its origin
- **WHEN** a finding is displayed for a flagged phrase
- **THEN** the entry includes the source line and column span, the severity, the message text, and the rule identifier
