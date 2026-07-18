# typst-compilation

## Purpose

In-browser compilation of user Typst source to PDF, including armymemo package resolution and diagnostic (error/warning) reporting.

## Requirements

### Requirement: In-browser compilation to PDF
The app SHALL compile the editor's current Typst source to PDF bytes entirely in the browser when the user activates Compile. No document content or compilation work SHALL leave the browser.

#### Scenario: Successful compile of valid source
- **WHEN** the user activates Compile with valid Typst source in the editor
- **THEN** the app produces the compiled PDF bytes in memory and reports success in the UI

#### Scenario: Compilation is fully local
- **WHEN** a compile runs (successfully or not)
- **THEN** the only network requests observable are same-origin fetches of the app's own static assets (compiler WASM, fonts, vendored package)

### Requirement: Offline armymemo package resolution
The compiler SHALL resolve `#import "@preview/armymemo:0.1.0"` from a package archive vendored in the app bundle, without contacting any package registry. Imports of packages that are not vendored SHALL fail with a diagnostic that names the unresolvable package.

#### Scenario: Starter example compiles through the vendored package
- **WHEN** the user compiles the pre-filled starter example (which imports `@preview/armymemo:0.1.0`)
- **THEN** compilation succeeds using only the vendored package archive, with no requests to packages.typst.org or any other external origin

#### Scenario: Non-vendored package fails clearly
- **WHEN** the source imports a package that is not vendored (e.g., `@preview/example:0.1.0`)
- **THEN** compilation fails and the diagnostics identify the package that could not be resolved

### Requirement: Vendored fonts
The compiler SHALL use fonts vendored in the app bundle, SHALL NOT fetch fonts from external origins at runtime, and SHALL compile armymemo documents with the vendored Liberation Sans family via armymemo's font input rather than by modifying user source.

#### Scenario: Compile uses vendored fonts only
- **WHEN** any compile runs
- **THEN** no font data is requested from a non-self origin, and armymemo text renders in Liberation Sans

### Requirement: Compile diagnostics
When compilation fails, the app SHALL present the compiler's error diagnostics in the output pane, including source location information where the compiler provides it. Diagnostics SHALL replace any previous preview so stale output is never mistaken for current.

#### Scenario: Syntax error surfaces with location
- **WHEN** the user compiles source containing a syntax error
- **THEN** the output pane shows the compiler's diagnostic text for that error, including its source location where available, and no stale preview remains visible

#### Scenario: Recovery after a failed compile
- **WHEN** the user fixes the error and compiles again
- **THEN** the diagnostics are cleared and the new successful result is shown
