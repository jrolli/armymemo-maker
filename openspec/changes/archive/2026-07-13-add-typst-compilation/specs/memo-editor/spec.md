# memo-editor

## MODIFIED Requirements

### Requirement: Two-pane layout with action bar
The page SHALL present the editor pane and an output pane side by side on desktop-width viewports, together with an action bar containing Compile and Download actions. Compile SHALL be enabled whenever the editor holds source and no compile is in progress, and SHALL show a busy state (and be inactive) while a compile runs. Download SHALL be disabled until a compile has succeeded. The layout SHALL remain usable (no overlapping or clipped content) at narrow viewport widths.

#### Scenario: Desktop layout
- **WHEN** the page is viewed at a desktop viewport width
- **THEN** the editor pane and output pane are visible simultaneously alongside an action bar with Compile and Download controls

#### Scenario: Compile is live
- **WHEN** the page has loaded with the starter example present
- **THEN** the Compile action is enabled and activating it starts a compilation

#### Scenario: Busy state during compile
- **WHEN** a compilation is in progress
- **THEN** the Compile action is inactive and visibly indicates work in progress until the compile finishes

#### Scenario: Narrow viewport does not break
- **WHEN** the page is viewed at a narrow (mobile-width) viewport
- **THEN** all panes and controls remain reachable and unclipped
