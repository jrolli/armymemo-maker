## ADDED Requirements

### Requirement: Offline availability after first visit
When served over a secure context (https or localhost), the app SHALL register a same-origin service worker that precaches the complete production bundle during the first visit, and SHALL thereafter load and function fully — editing, compiling, signature-field application, preview, and download — with no network connectivity. The precache asset list SHALL be generated from the actual build output, and the build SHALL fail if any file in `dist/` is not covered by it. After a redeploy, the next online visit SHALL fetch the new version in the background and serve it from the following load, without user-facing update prompts. The app SHALL be installable as a standalone app via a web application manifest with a same-origin icon.

#### Scenario: App works offline after one visit
- **WHEN** a user loads the app once over a secure context, the service worker finishes precaching, and the browser then goes fully offline
- **THEN** reloading the page presents the working app, and compiling and downloading a signable PDF succeed using only cached same-origin assets

#### Scenario: Precache completeness is build-enforced
- **WHEN** a production build produces a file in `dist/` that the service worker's precache list does not cover
- **THEN** the build fails, naming the uncovered file

#### Scenario: Redeploy reaches users without prompts
- **WHEN** a new version is deployed and a user with the old version cached visits while online
- **THEN** the new version is fetched in the background and served on the following load, with no update prompt

#### Scenario: Installable manifest
- **WHEN** the app is served in production
- **THEN** it exposes a valid web application manifest and same-origin icon suitable for standalone installation

#### Scenario: Offline machinery is same-origin only
- **WHEN** the service worker installs, serves, or updates content
- **THEN** every fetched or cached URL is on the app's own origin
