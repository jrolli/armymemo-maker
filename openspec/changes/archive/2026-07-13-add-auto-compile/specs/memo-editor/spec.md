## MODIFIED Requirements

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
