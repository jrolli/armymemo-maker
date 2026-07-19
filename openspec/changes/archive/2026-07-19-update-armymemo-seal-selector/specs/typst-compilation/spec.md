## ADDED Requirements

### Requirement: Vendored armymemo package provenance
The armymemo package archive SHALL be vendored in the repository as a tarball regenerated from a pinned upstream commit by a maintenance script, and the tarball SHALL contain exactly the package payload of that commit (`typst.toml`, `lib.typ`, the seal images, and the upstream `LICENSE`). Regenerating the tarball SHALL be an explicit script action that may use the network; the app build and runtime SHALL use only the committed tarball. Updating the vendored package SHALL consist of changing the pinned commit and regenerating the tarball, keeping the pin, the tarball, and the starter example's pinned `#import` version consistent.

#### Scenario: Refreshed tarball reproduces the pinned commit
- **WHEN** the maintenance script runs after its pinned commit is updated
- **THEN** the regenerated tarball contains the package payload of exactly that commit, including the upstream `LICENSE`, under the version declared by that commit's `typst.toml`

#### Scenario: Build stays hermetic across a package update
- **WHEN** the app is built from a clean checkout after a vendored-package update, with no network access beyond the static server
- **THEN** the build succeeds using only the committed tarball, and the starter example compiles against it
