## Context

The footer (`<footer class="action-bar">` in `index.html`) currently holds the Compile/Download actions and the "100% local" note. The build enforces the local-only contract two ways that matter here:

- `scripts/check-local-only.mjs` scans every text file in `dist/` for `http(s)://` URLs and fails on anything not in its `ALLOWED_PREFIXES` list. A footer `<a href="https://github.com/...">` would trip it today.
- The production CSP (`default-src 'self'` etc., injected by `vite.config.ts`) restricts resource *loads*. It does not restrict user-initiated link navigation, so an anchor needs no CSP change.

## Goals / Non-Goals

**Goals:**
- A visible, styled footer link to https://github.com/jrolli/armymemo-maker (satisfying AGPL §13 source-offer expectations for the hosted app).
- Keep the local-only enforcement machinery strict — allowlist exactly one URL, with rationale recorded in code.

**Non-Goals:**
- No acknowledgements/licensing page (separate change: `add-acknowledgements-page`).
- No CSP changes, no new runtime code, no analytics of any kind.

## Decisions

**D1 — Plain anchor in the existing footer, opening in a new tab.**
Add `<a href="https://github.com/jrolli/armymemo-maker" target="_blank" rel="noopener noreferrer">Source on GitHub</a>` next to the `.local-note` paragraph (or merged into it, whichever reads better with the existing copy). `target="_blank"` keeps the editor page — and any in-progress compile — open; drafts persist regardless, but losing the page mid-compile is still an avoidable annoyance. `rel="noopener noreferrer"` severs the opener relationship. Alternative considered: same-tab navigation — rejected as strictly worse UX for no benefit.

**D2 — Exact-URL allowlist entry in `check-local-only.mjs`.**
Add `"https://github.com/jrolli/armymemo-maker"` to `ALLOWED_PREFIXES` with a comment mirroring the existing dead-code-URL entries: this string is a navigation-only href, never fetched by the app, and the CSP plus the Playwright same-origin network assertions remain the live enforcement. Alternative considered: allowlisting a broad `https://github.com/` prefix — rejected; keep the allowlist as narrow as the thing it excuses.

**D3 — No spec change to `local-delivery`.**
The local-delivery requirement is about network *requests*; an unactivated anchor makes none, and the allowlist mechanism already exists in the check (typst.ts dead-code URLs). The delta lands on `memo-editor`, whose layout requirement owns the footer.

## Risks / Trade-offs

- [Repository moves/renames → stale link and stale allowlist] → The URL appears in exactly two places (`index.html`, the allowlist); both name the repo explicitly and are trivially greppable.
- [Allowlist creep normalizes external references] → Each entry requires a written rationale; this adds one navigation-only URL, not a fetch origin.
