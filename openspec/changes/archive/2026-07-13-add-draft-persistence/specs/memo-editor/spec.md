## ADDED Requirements

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

## MODIFIED Requirements

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
