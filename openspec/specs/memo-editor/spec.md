# memo-editor

## Purpose

The memo source input surface for memo.army.dev — Typst or Markdown editing with a source-format toggle, starter example content, and the surrounding page layout with output and action areas.
## Requirements
### Requirement: Typst source editing surface
The app SHALL present an editable plain-text surface for Typst memo source that preserves the entered text exactly (including whitespace and Unicode) and SHALL expose the current source to application code through a single editor interface.

#### Scenario: User edits Typst source
- **WHEN** the user types or pastes Typst source into the editor
- **THEN** the editor contains exactly the entered text, and the application can read the current source verbatim through the editor interface

#### Scenario: Multi-line memo content is preserved
- **WHEN** the user pastes a complete multi-line armymemo document including indentation and blank lines
- **THEN** no characters, line breaks, or leading whitespace are altered

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

### Requirement: Two-pane layout with action bar
The page SHALL present the editor pane and an output pane side by side on desktop-width viewports, together with an action bar containing Compile and Download actions. Compilation SHALL run automatically: an initial compile SHALL start on page load, and after any edit a recompile SHALL be scheduled to run once the user has stopped editing for a short debounce interval, so the output always converges on the latest source. At most one compile SHALL run at a time; edits arriving during a running compile SHALL coalesce into a single trailing recompile of the latest source. The Compile action SHALL trigger an immediate compile (bypassing the debounce wait), SHALL be enabled whenever the editor holds source and no compile is in progress, and SHALL show a busy state (and be inactive) while a compile runs. Download SHALL be disabled until a compile has succeeded. The layout SHALL remain usable (no overlapping or clipped content) at narrow viewport widths.

#### Scenario: Desktop layout
- **WHEN** the page is viewed at a desktop viewport width
- **THEN** the editor pane and output pane are visible simultaneously alongside an action bar with Compile and Download controls

#### Scenario: Initial compile on load
- **WHEN** the page finishes loading with the starter example present
- **THEN** a compile of the starter example starts automatically and its result appears in the output pane without any user interaction

#### Scenario: Edits trigger a debounced recompile
- **WHEN** the user edits the source and then stops editing
- **THEN** a recompile of the latest source starts automatically after the debounce interval, without activating Compile

#### Scenario: Rapid edits coalesce
- **WHEN** the user edits continuously and further edits arrive while a compile is running
- **THEN** at most one compile runs at a time, and after the user stops editing exactly one trailing recompile of the final source runs, leaving the output reflecting the latest text

#### Scenario: Compile is live
- **WHEN** the page has loaded with the starter example present and no compile is in progress
- **THEN** the Compile action is enabled and activating it starts a compilation immediately

#### Scenario: Busy state during compile
- **WHEN** a compilation is in progress
- **THEN** the Compile action is inactive and visibly indicates work in progress until the compile finishes

#### Scenario: Narrow viewport does not break
- **WHEN** the page is viewed at a narrow (mobile-width) viewport
- **THEN** all panes and controls remain reachable and unclipped

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

### Requirement: Source repository link
The page footer SHALL contain a hyperlink to the project's source repository (https://github.com/jrolli/armymemo-maker), clearly labeled as such. The link SHALL be navigation-only: rendering the page SHALL cause no network request to the repository host or any other external origin, and the production build's local-only check SHALL pass with the link present via an explicit, commented allowlist entry for the repository URL.

#### Scenario: Footer shows the repository link
- **WHEN** the page loads
- **THEN** the footer contains a visible link whose destination is the project's GitHub repository

#### Scenario: Link causes no runtime traffic
- **WHEN** the page loads and the user does not activate the link
- **THEN** no network request is made to the repository host or any other non-self origin

#### Scenario: Local-only build check still passes
- **WHEN** `npm run build` runs with the repository link in `index.html`
- **THEN** `check-local-only` succeeds, with the repository URL covered by an explicit allowlist entry rather than a weakened scan

### Requirement: Last-updated date in footer
The page footer SHALL display the date the deployed site's source was last changed, as a human-readable "Updated YYYY-MM-DD" line using a semantic `<time>` element with a matching `datetime` attribute. The date SHALL be resolved at build time from the built revision's version-control commit date — never from the build clock — so that rebuilding the same source produces byte-identical output and does not trigger the service-worker update flow. The date SHALL be present in the delivered static HTML, requiring no runtime computation or network request. When version-control metadata is unavailable at build time, the build SHALL still succeed, fall back to the current date, and print a warning naming the fallback.

#### Scenario: Footer shows the revision date
- **WHEN** the production bundle is built from a git checkout and the page is loaded
- **THEN** the footer displays "Updated" followed by the HEAD commit's date in YYYY-MM-DD form, inside a `<time>` element whose `datetime` attribute carries the same value

#### Scenario: Rebuild of unchanged source is byte-identical
- **WHEN** the same source revision is built twice at different wall-clock times
- **THEN** the rendered date and the emitted HTML bytes are identical, and no service-worker update is triggered by the second build

#### Scenario: No placeholder leaks
- **WHEN** the page is served by the dev server or from the production bundle
- **THEN** the rendered footer contains a real date, never the build-time placeholder token

#### Scenario: Build without version control still succeeds
- **WHEN** the site is built in a tree where the git commit date cannot be resolved
- **THEN** the build succeeds, the footer shows the current date, and the build output warns that the fallback was used

### Requirement: Prose findings display
The editor page SHALL display prose lint findings for each compile
snapshot in a dedicated findings area, distinct from the compile
diagnostics area and the field status line. Linting SHALL follow the same
cadence as compilation — the same debounced automatic trigger and manual
compile action, on the same source snapshot — and SHALL lint the source as
the user entered it: the Markdown text in Markdown mode and the Typst text
in Typst mode, never the converted Typst. The findings area SHALL be
replaced atomically per snapshot (findings from different snapshots are
never mixed), SHALL be hidden when the latest lint produced no findings,
and SHALL NOT affect the preview, download availability, or diagnostics
display in any compile outcome.

#### Scenario: Findings appear beside a successful compile
- **WHEN** the editor source compiles successfully and contains a wordy phrase
- **THEN** the preview and download behave as before this change, and the findings area lists the phrase's finding with its position

#### Scenario: Findings appear despite a failed compile
- **WHEN** the editor source fails to compile but its prose yields findings
- **THEN** the diagnostics area shows the compile failure exactly as before this change, and the findings area shows the prose findings

#### Scenario: Clean prose hides the findings area
- **WHEN** a snapshot's lint produces no findings
- **THEN** the findings area is hidden

#### Scenario: Markdown mode lints the Markdown
- **WHEN** Markdown mode is active and the body's line 7 contains a flagged phrase
- **THEN** the finding reports line 7, matching the visible Markdown text
