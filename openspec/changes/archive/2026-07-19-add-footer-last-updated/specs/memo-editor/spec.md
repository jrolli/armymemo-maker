# memo-editor (delta)

## ADDED Requirements

### Requirement: Last-updated date in footer
The page footer SHALL display the date the deployed site's source was last changed, as a human-readable "Updated YYYY-MM-DD" line using a semantic `<time>` element with a matching `datetime` attribute. The date SHALL be resolved at build time from the built revision's version-control commit date — never from the build clock — so that rebuilding the same source produces byte-identical output and does not trigger the service-worker update flow. The date SHALL be present in the delivered static HTML, requiring no runtime computation or network request. When version-control metadata is unavailable at build time, the build SHALL still succeed, fall back to the current date, and print a warning naming the fallback.

#### Scenario: Footer shows the revision date
- **WHEN** the production bundle is built from a git checkout and the page is loaded
- **THEN** the footer displays "Updated" followed by the HEAD commit's date in YYYY-MM-DD form, inside a `<time>` element whose `datetime` attribute carries the same value

#### Scenario: Rebuild of unchanged source is byte-identical
- **WHEN** the same source revision is built twice at different wall-clock times
- **THEN** the rendered date and the emitted HTML bytes are identical, and no service-worker update is triggered by the second build

#### Scenario: No placeholder leaks
- **WHEN** the page is served by the dev server or from the production bundle
- **THEN** the rendered footer contains a real date, never the build-time placeholder token

#### Scenario: Build without version control still succeeds
- **WHEN** the site is built in a tree where the git commit date cannot be resolved
- **THEN** the build succeeds, the footer shows the current date, and the build output warns that the fallback was used
