# memo-editor (delta)

## ADDED Requirements

### Requirement: Source repository link
The page footer SHALL contain a hyperlink to the project's source repository (https://github.com/jrolli/armymemo-maker), clearly labeled as such. The link SHALL be navigation-only: rendering the page SHALL cause no network request to the repository host or any other external origin, and the production build's local-only check SHALL pass with the link present via an explicit, commented allowlist entry for the repository URL.

#### Scenario: Footer shows the repository link
- **WHEN** the page loads
- **THEN** the footer contains a visible link whose destination is the project's GitHub repository

#### Scenario: Link causes no runtime traffic
- **WHEN** the page loads and the user does not activate the link
- **THEN** no network request is made to the repository host or any other non-self origin

#### Scenario: Local-only build check still passes
- **WHEN** `npm run build` runs with the repository link in `index.html`
- **THEN** `check-local-only` succeeds, with the repository URL covered by an explicit allowlist entry rather than a weakened scan
