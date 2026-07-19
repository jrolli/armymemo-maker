## Why

The footer tells users the app is local-only and links the source, but nothing tells them how fresh the deployed site is. With the new user-controlled update flow, a visible "last updated" date lets users see at a glance what vintage they are running — useful for a document-producing tool where formatting rules (AR 25-50, armymemo package) evolve.

## What Changes

- The page footer gains a "Updated YYYY-MM-DD" line rendered in a semantic `<time>` element.
- The date is injected at build time by a small Vite plugin and reflects the built revision's git commit date — not the build clock — so rebuilding unchanged source produces identical bytes and never trips the service-worker update prompt.
- Dev mode shows the same injected date (the plugin runs on the dev server's HTML transform too).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memo-editor`: the footer requirements gain a last-updated date requirement (ADDED requirement in the existing capability; the two-pane layout, action bar, and repository-link requirements are unchanged).

## Impact

- `index.html` — placeholder `<time>` element in the footer meta block.
- `vite.config.ts` — new `injectLastUpdated` plugin resolving the HEAD commit date and substituting the placeholder.
- `src/style.css` — muted styling consistent with the existing `.local-note` footer text.
- No new dependencies, no runtime network requests, no service-worker or precache changes (the date is baked into the HTML at build time).
