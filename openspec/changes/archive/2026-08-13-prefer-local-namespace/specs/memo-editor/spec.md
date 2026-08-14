## MODIFIED Requirements

### Requirement: Starter example content
The editor SHALL be pre-filled with a minimal, valid armymemo example document that imports a pinned armymemo package version from the `@local` namespace when no usable saved draft exists — on first visit, after storage is cleared, or when the saved draft is empty or whitespace-only. When a usable saved draft exists, the editor SHALL contain the draft instead of the example, exactly as saved — drafts SHALL NOT be rewritten to the preferred namespace.

#### Scenario: First visit shows example memo
- **WHEN** the user loads the page with no saved draft present
- **THEN** the editor contains a complete example armymemo document beginning with an `#import "@local/armymemo:` line pinned to a specific version

#### Scenario: Returning visit shows the draft, not the example
- **WHEN** the user loads the page with a saved draft present (including one whose import uses the `@preview` namespace)
- **THEN** the editor contains the saved draft verbatim and not the starter example

#### Scenario: Blank draft falls back to the example
- **WHEN** the saved draft is empty or contains only whitespace
- **THEN** the editor is pre-filled with the starter example as on first visit

#### Scenario: Example is replaceable
- **WHEN** the user selects all editor content and replaces it with their own source
- **THEN** the editor contains only the user's source with no residue of the example
