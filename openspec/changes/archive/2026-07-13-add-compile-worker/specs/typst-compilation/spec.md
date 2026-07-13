## ADDED Requirements

### Requirement: Responsive compilation off the main thread
Compilation work (Typst compile, field query, and esign field application) SHALL execute off the browser's main thread in a dedicated same-origin worker, so the page remains interactive while a compile is in flight. All worker code and assets SHALL load from the app's own origin, preserving the local-only contract.

#### Scenario: Typing stays smooth during a compile
- **WHEN** the user types in the editor while a compile is running
- **THEN** the typed characters appear without perceptible delay and the main thread is not blocked for the duration of the compile

#### Scenario: Worker is same-origin
- **WHEN** the app compiles a document
- **THEN** the worker script, compiler WASM, fonts, vendored package, and esign WASM are all fetched from the app's own origin only

#### Scenario: Behavior is unchanged by the thread move
- **WHEN** a document is compiled after this change
- **THEN** outputs, diagnostics, field statuses, busy state, and download behavior are identical to main-thread compilation
