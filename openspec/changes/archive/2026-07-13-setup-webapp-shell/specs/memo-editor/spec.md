# memo-editor

## ADDED Requirements

### Requirement: Typst source editing surface
The app SHALL present an editable plain-text surface for Typst memo source that preserves the entered text exactly (including whitespace and Unicode) and SHALL expose the current source to application code through a single editor interface.

#### Scenario: User edits Typst source
- **WHEN** the user types or pastes Typst source into the editor
- **THEN** the editor contains exactly the entered text, and the application can read the current source verbatim through the editor interface

#### Scenario: Multi-line memo content is preserved
- **WHEN** the user pastes a complete multi-line armymemo document including indentation and blank lines
- **THEN** no characters, line breaks, or leading whitespace are altered

### Requirement: Starter example content
The editor SHALL be pre-filled on first load with a minimal, valid armymemo example document that imports a pinned armymemo package version, so a first-time visitor sees the expected input shape.

#### Scenario: First visit shows example memo
- **WHEN** the user loads the page
- **THEN** the editor contains a complete example armymemo document beginning with an `#import "@preview/armymemo:` line pinned to a specific version

#### Scenario: Example is replaceable
- **WHEN** the user selects all editor content and replaces it with their own source
- **THEN** the editor contains only the user's source with no residue of the example

### Requirement: Two-pane layout with action bar
The page SHALL present the editor pane and an output pane side by side on desktop-width viewports, together with an action bar containing Compile and Download actions. While no downstream pipeline exists, both actions SHALL be rendered in a visibly disabled state and the output pane SHALL show an empty-state message; the layout SHALL remain usable (no overlapping or clipped content) at narrow viewport widths.

#### Scenario: Desktop layout
- **WHEN** the page is viewed at a desktop viewport width
- **THEN** the editor pane and output pane are visible simultaneously alongside an action bar with Compile and Download controls

#### Scenario: Actions disabled in shell
- **WHEN** no compilation capability is present in the build
- **THEN** Compile and Download are visibly disabled, cannot be activated by mouse or keyboard, and indicate that the capability is not yet available

#### Scenario: Narrow viewport does not break
- **WHEN** the page is viewed at a narrow (mobile-width) viewport
- **THEN** all panes and controls remain reachable and unclipped
