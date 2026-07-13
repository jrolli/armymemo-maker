## Why

The app is licensed AGPL-3.0-or-later, but the served page offers visitors no pointer to its source code — AGPL §13 requires prominently offering users who interact with the app over a network an opportunity to receive the Corresponding Source. A visible repository link also lets users audit the "100% local" claim instead of taking it on faith.

## What Changes

- Add a link to the project's GitHub repository (https://github.com/jrolli/armymemo-maker) to the page footer, alongside the existing "100% local" note.
- Allowlist the repository URL in `scripts/check-local-only.mjs` with a comment explaining why it is safe: it is a navigation-only `<a href>`, never fetched at runtime, and the production CSP is unaffected (CSP does not govern user-initiated link navigation).
- Style the link to fit the existing footer.

No runtime behavior changes: the app still makes zero network requests beyond its own static assets.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memo-editor`: the page layout gains a new requirement (ADDED in the delta) that the footer contains a source-repository link which causes no runtime network traffic.

## Impact

- `index.html` — footer markup gains the anchor.
- `src/style.css` — link styling in the action bar.
- `scripts/check-local-only.mjs` — one allowlist entry for the repository URL.
- No changes to CSP, service worker, precache, or any `src/` module.
