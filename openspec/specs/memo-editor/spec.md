# memo-editor

## Purpose

The Typst source input surface for memo.army.dev — editing, starter example content, and the surrounding page layout with output and action areas.
## Requirements
### Requirement: Typst source editing surface
The app SHALL present an editable plain-text surface for Typst memo source that preserves the entered text exactly (including whitespace and Unicode) and SHALL expose the current source to application code through a single editor interface.

#### Scenario: User edits Typst source
- **WHEN** the user types or pastes Typst source into the editor
- **THEN** the editor contains exactly the entered text, and the application can read the current source verbatim through the editor interface

#### Scenario: Multi-line memo content is preserved
- **WHEN** the user pastes a complete multi-line armymemo document including indentation and blank lines
- **THEN** no characters, line breaks, or leading whitespace are altered

### Requirement: Starter example content
The editor SHALL be pre-filled with a minimal, valid armymemo example document that imports a pinned armymemo package version when no usable saved draft exists — on first visit, after storage is cleared, or when the saved draft is empty or whitespace-only. When a usable saved draft exists, the editor SHALL contain the draft instead of the example.

#### Scenario: First visit shows example memo
- **WHEN** the user loads the page with no saved draft present
- **THEN** the editor contains a complete example armymemo document beginning with an `#import "@preview/armymemo:` line pinned to a specific version

#### Scenario: Returning visit shows the draft, not the example
- **WHEN** the user loads the page with a saved draft present
- **THEN** the editor contains the saved draft and not the starter example

#### Scenario: Blank draft falls back to the example
- **WHEN** the saved draft is empty or contains only whitespace
- **THEN** the editor is pre-filled with the starter example as on first visit

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
The app SHALL save the editor's current source to browser `localStorage` on every edit and SHALL restore the saved draft into the editor on page load, so a draft survives reloads, tab crashes, and browser restarts on the same machine. Draft data SHALL be stored only in same-origin browser storage — never transmitted. When `localStorage` is unavailable or a write fails (private browsing, disabled or full storage), the app SHALL continue to function identically except that drafts do not persist, with no error thrown to the user.

#### Scenario: Draft survives a reload
- **WHEN** the user edits the source and reloads the page
- **THEN** the editor contains the edited source exactly as last typed, and the initial automatic compile renders that draft

#### Scenario: Persistence is local-only
- **WHEN** drafts are saved and restored
- **THEN** no network request carries any draft content; storage is same-origin `localStorage` only

#### Scenario: Storage unavailable degrades gracefully
- **WHEN** `localStorage` is unavailable or throws on write
- **THEN** editing, compiling, and downloading all work as before, and no storage error surfaces to the user; drafts simply do not persist

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

