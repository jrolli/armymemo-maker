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
The compiler SHALL resolve the vendored armymemo package archive under both `#import "@local/armymemo:0.2.3"` (the preferred, documented form, since armymemo is not published to Typst Universe) and `#import "@preview/armymemo:0.2.3"` (compatibility with existing drafts and documents), without contacting any package registry. Both namespaces SHALL resolve to the same vendored archive in the app bundle. Resolution SHALL succeed regardless of whether the delivery path preserves the archive's compression layer or strips it in transit (as servers that infer `Content-Encoding` from the `.gz` extension do, including the Vite dev server): the app SHALL detect which form it received and restore the form the compiler requires. Imports of packages that are not vendored — a different name, a different version, or any namespace other than `local` or `preview` — SHALL fail with a diagnostic that names the unresolvable package.

#### Scenario: Starter example compiles through the vendored package
- **WHEN** the user compiles the pre-filled starter example (which imports `@local/armymemo:0.2.3`)
- **THEN** compilation succeeds using only the vendored package archive, with no requests to packages.typst.org or any other external origin

#### Scenario: Existing @preview documents keep compiling
- **WHEN** the user compiles a document that imports `@preview/armymemo:0.2.3` (such as a draft saved before `@local` became the preferred form)
- **THEN** compilation succeeds using the same vendored package archive, with no requests to any external origin

#### Scenario: Starter example compiles in the dev server
- **WHEN** a developer runs the documented dev command and the app compiles the pre-filled starter example
- **THEN** compilation succeeds using the vendored package archive, even though the dev server delivers it with the compression layer stripped

#### Scenario: Non-vendored package fails clearly
- **WHEN** the source imports a package that is not vendored (e.g., `@preview/example:0.1.0` or `@local/example:0.1.0`)
- **THEN** compilation fails and the diagnostics identify the package that could not be resolved

### Requirement: Vendored armymemo package provenance
The armymemo package archive SHALL be vendored in the repository as a tarball regenerated from a pinned upstream commit by a maintenance script, and the tarball SHALL contain exactly the package payload of that commit (`typst.toml`, `lib.typ`, the seal images, and the upstream `LICENSE`). Regenerating the tarball SHALL be an explicit script action that may use the network; the app build and runtime SHALL use only the committed tarball. Updating the vendored package SHALL consist of changing the pinned commit and regenerating the tarball, keeping the pin, the tarball, and the starter example's pinned `#import` version consistent.

#### Scenario: Refreshed tarball reproduces the pinned commit
- **WHEN** the maintenance script runs after its pinned commit is updated
- **THEN** the regenerated tarball contains the package payload of exactly that commit, including the upstream `LICENSE`, under the version declared by that commit's `typst.toml`

#### Scenario: Build stays hermetic across a package update
- **WHEN** the app is built from a clean checkout after a vendored-package update, with no network access beyond the static server
- **THEN** the build succeeds using only the committed tarball, and the starter example compiles against it

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

### Requirement: Responsive compilation off the main thread
Compilation work (Typst compile, field query, and eform field application) SHALL execute off the browser's main thread in a dedicated same-origin worker, so the page remains interactive while a compile is in flight. All worker code and assets SHALL load from the app's own origin, preserving the local-only contract.

#### Scenario: Typing stays smooth during a compile
- **WHEN** the user types in the editor while a compile is running
- **THEN** the typed characters appear without perceptible delay and the main thread is not blocked for the duration of the compile

#### Scenario: Worker is same-origin
- **WHEN** the app compiles a document
- **THEN** the worker script, compiler WASM, fonts, vendored package, and eform WASM are all fetched from the app's own origin only

#### Scenario: Behavior is unchanged by the thread move
- **WHEN** a document is compiled after this change
- **THEN** outputs, diagnostics, field statuses, busy state, and download behavior are identical to main-thread compilation

