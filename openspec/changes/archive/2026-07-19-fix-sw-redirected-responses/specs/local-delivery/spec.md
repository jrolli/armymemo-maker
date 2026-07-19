# local-delivery (delta)

## ADDED Requirements

### Requirement: Support for URL-canonicalizing static hosts
When the serving host redirects between the `.html` and extensionless ("pretty") forms of a page URL, the service worker SHALL still deliver full offline and online function: responses stored during precache SHALL be usable for navigation responses (a response carrying the redirect flag SHALL never be served to a navigation), and a navigation to either URL form of a precached HTML page SHALL be served that page rather than the app shell. Behavior on hosts that serve every URL directly SHALL be unchanged, and a precache fetch that fails or returns a non-OK status SHALL still fail the entire install.

#### Scenario: Precached page serves on a redirecting host
- **WHEN** the host 308-redirects `/acknowledgements.html` to `/acknowledgements` and a user with the worker installed navigates to `/acknowledgements.html`
- **THEN** the acknowledgements page renders in every engine, with no redirected-response navigation error (e.g. WebKit's "Response served by service worker has redirections")

#### Scenario: Pretty URL serves the precached page
- **WHEN** a user navigates to the extensionless form of a precached HTML page (e.g. `/acknowledgements`), online or offline
- **THEN** that page is served — not the `/` app shell

#### Scenario: Plain hosts are unaffected
- **WHEN** the bundle is served by a plain static file server that never redirects
- **THEN** precaching, navigation, and offline behavior are identical to the previous worker

#### Scenario: Partial precache still fails install
- **WHEN** any precache asset fetch fails or returns a non-OK status during install
- **THEN** the install fails as a whole and no partial cache is activated
