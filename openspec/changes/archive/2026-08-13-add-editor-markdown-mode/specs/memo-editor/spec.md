## ADDED Requirements

### Requirement: Source format mode toggle
The editor pane SHALL present a visible two-option source-format control
(Typst and Markdown) with Typst selected by default. In Markdown mode the
editor holds a Markdown memo (YAML front matter + CommonMark body) and every
compile SHALL first convert the source with the same Markdown-to-Typst
conversion the file conversion page uses, feeding the converted Typst through
the unchanged compile → field-extraction → signable-PDF pipeline; the
download filename SHALL derive from the converted Typst source so
subject-based naming behaves identically in both modes. A Markdown conversion
failure SHALL be reported in the editor's diagnostics area like a compile
failure — without invoking the compiler — and SHALL leave the previous
successful output and its Download availability unchanged. The selected mode
SHALL persist across reloads in same-origin browser storage with the same
graceful degradation as drafts; an absent or unrecognized stored mode SHALL
resolve to Typst.

#### Scenario: Toggle is visible with Typst default
- **WHEN** the page loads on a first visit
- **THEN** the editor pane shows a Typst/Markdown format control with Typst selected, and the editor behaves exactly as before this change

#### Scenario: Markdown memo compiles to a signable PDF
- **WHEN** Markdown mode is selected and the editor holds a valid Markdown memo whose front matter and body convert successfully
- **THEN** the automatic compile renders the same memo the equivalent Typst source would produce, including form-field extraction and the signable-PDF download

#### Scenario: Conversion failure surfaces as diagnostics
- **WHEN** Markdown mode is selected and the source has malformed or missing front matter or an unsupported Markdown construct
- **THEN** the diagnostics area shows the conversion error message in place of the preview, and any previously compiled PDF remains downloadable unchanged

#### Scenario: Markdown download filename derives from the subject
- **WHEN** a Markdown memo whose front matter includes a subject compiles successfully and the user activates Download
- **THEN** the downloaded file is named from that subject exactly as it would be for the equivalent Typst source

#### Scenario: Mode persists across reload
- **WHEN** the user selects Markdown mode and reloads the page
- **THEN** Markdown mode is still selected and the editor holds the Markdown draft or example

#### Scenario: Unrecognized stored mode falls back to Typst
- **WHEN** the persisted mode value is missing or not a known mode
- **THEN** the page loads in Typst mode and functions normally

## MODIFIED Requirements

### Requirement: Starter example content
The editor SHALL be pre-filled, per source-format mode, with a minimal valid
example memo when no usable saved draft exists for that mode — on first
visit, after storage is cleared, or when that mode's saved draft is empty or
whitespace-only. In Typst mode the example is an armymemo document that
imports a pinned armymemo package version from the `@local` namespace; in
Markdown mode the example is the same memo expressed as YAML front matter
plus a numbered-list body, and the production build SHALL mechanically verify
that the shipped Markdown example converts successfully. When a usable saved
draft exists for the active mode, the editor SHALL contain that draft instead
of the example, exactly as saved — drafts SHALL NOT be rewritten to the
preferred namespace.

#### Scenario: First visit shows example memo
- **WHEN** the user loads the page with no saved draft present
- **THEN** the editor contains a complete example armymemo document beginning with an `#import "@local/armymemo:` line pinned to a specific version

#### Scenario: First switch to Markdown shows the Markdown example
- **WHEN** the user switches to Markdown mode with no saved Markdown draft present
- **THEN** the editor contains a complete example Markdown memo beginning with YAML front matter, and it compiles successfully

#### Scenario: Markdown example is build-verified
- **WHEN** the production build runs
- **THEN** a build gate fails if the shipped Markdown starter example does not convert to Typst successfully

#### Scenario: Returning visit shows the draft, not the example
- **WHEN** the user loads the page with a saved draft present for the active mode (including a Typst draft whose import uses the `@preview` namespace)
- **THEN** the editor contains that saved draft verbatim and not the starter example

#### Scenario: Blank draft falls back to the example
- **WHEN** the active mode's saved draft is empty or contains only whitespace
- **THEN** the editor is pre-filled with that mode's starter example as on first visit

#### Scenario: Example is replaceable
- **WHEN** the user selects all editor content and replaces it with their own source
- **THEN** the editor contains only the user's source with no residue of the example

### Requirement: Draft persistence
The app SHALL save the editor's current source to browser `localStorage` on
every edit under a key specific to the active source-format mode, and SHALL
restore the active mode's saved draft into the editor on page load, so a
draft survives reloads, tab crashes, and browser restarts on the same
machine. The Typst draft SHALL remain under the pre-existing draft key so
drafts saved before the Markdown mode existed keep working unchanged.
Switching modes SHALL NOT discard either mode's draft: the outgoing mode's
draft remains stored, and the incoming mode's draft (or starter example) is
loaded. Draft and mode data SHALL be stored only in same-origin browser
storage — never transmitted. When `localStorage` is unavailable or a write
fails (private browsing, disabled or full storage), the app SHALL continue to
function identically except that drafts and the mode do not persist, with no
error thrown to the user.

#### Scenario: Draft survives a reload
- **WHEN** the user edits the source and reloads the page
- **THEN** the editor contains the edited source exactly as last typed, and the initial automatic compile renders that draft

#### Scenario: Each mode keeps its own draft across switches
- **WHEN** the user edits in Typst mode, switches to Markdown mode and edits, then switches back to Typst mode
- **THEN** the editor contains the Typst draft exactly as last typed, and switching to Markdown mode again shows the Markdown draft exactly as last typed

#### Scenario: Pre-existing Typst draft survives the upgrade
- **WHEN** the page loads with a draft saved under the draft key from before the Markdown mode existed
- **THEN** the editor opens in Typst mode containing that draft verbatim

#### Scenario: Persistence is local-only
- **WHEN** drafts and the selected mode are saved and restored
- **THEN** no network request carries any draft content; storage is same-origin `localStorage` only

#### Scenario: Storage unavailable degrades gracefully
- **WHEN** `localStorage` is unavailable or throws on write
- **THEN** editing, compiling, and downloading all work as before, and no storage error surfaces to the user; drafts and the selected mode simply do not persist
