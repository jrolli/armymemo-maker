## ADDED Requirements

### Requirement: Static-host per-file size limit
Every file in the production bundle (`dist/`) SHALL be smaller than 25 MiB (26,214,400 bytes), so the bundle can be uploaded to static hosts that enforce a per-file size cap (such as Cloudflare). Assets whose raw form exceeds the limit SHALL be shipped in a compressed encoding that the app decodes in the browser at load time, without introducing any non-self-origin request and without depending on host-specific serving behavior (such as `Content-Encoding` headers) that a plain static file server would not provide. This SHALL be enforced by an automated build-time check that fails the build and names each offending file and its size.

#### Scenario: Build fails on an oversized file
- **WHEN** a production build emits a file in `dist/` of 25 MiB or larger
- **THEN** the build fails, and the check's output names the offending file and its size

#### Scenario: Bundle deploys within the cap
- **WHEN** the production bundle is built
- **THEN** every file in `dist/` — including the Typst compiler WASM, shipped compressed — is under 25 MiB

#### Scenario: Compressed assets work from a plain static server
- **WHEN** the bundle is served by a plain static file server with no special header configuration and the user compiles a memo
- **THEN** the app loads the compressed compiler asset from the app's own origin, decodes it in the browser, and compilation succeeds exactly as with an uncompressed asset
