# Delta: typst-compilation (update-armymemo-021)

## MODIFIED Requirements

### Requirement: Offline armymemo package resolution
The compiler SHALL resolve `#import "@preview/armymemo:0.2.1"` from a package archive vendored in the app bundle, without contacting any package registry. Resolution SHALL succeed regardless of whether the delivery path preserves the archive's compression layer or strips it in transit (as servers that infer `Content-Encoding` from the `.gz` extension do, including the Vite dev server): the app SHALL detect which form it received and restore the form the compiler requires. Imports of packages that are not vendored SHALL fail with a diagnostic that names the unresolvable package.

#### Scenario: Starter example compiles through the vendored package
- **WHEN** the user compiles the pre-filled starter example (which imports `@preview/armymemo:0.2.1`)
- **THEN** compilation succeeds using only the vendored package archive, with no requests to packages.typst.org or any other external origin

#### Scenario: Starter example compiles in the dev server
- **WHEN** a developer runs the documented dev command and the app compiles the pre-filled starter example
- **THEN** compilation succeeds using the vendored package archive, even though the dev server delivers it with the compression layer stripped

#### Scenario: Non-vendored package fails clearly
- **WHEN** the source imports a package that is not vendored (e.g., `@preview/example:0.1.0`)
- **THEN** compilation fails and the diagnostics identify the package that could not be resolved
