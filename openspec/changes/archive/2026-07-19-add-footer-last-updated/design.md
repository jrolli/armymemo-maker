## Context

The footer (`.footer-meta` in `index.html`) carries the local-only note and navigation links. The build is a static Vite bundle whose service worker cache name is a content hash of every emitted byte (`scripts/generate-sw.mjs`), and — since add-sw-update-button — any byte-different deploy surfaces an "Update available" prompt to users. Anything injected into the HTML therefore directly feeds the update-detection machinery. CI builds the site from a clean git checkout; the self-hosting zip is a built artifact, so builds effectively always happen inside a git checkout.

## Goals / Non-Goals

**Goals:**
- A human-readable "last updated" date in the footer, present in the delivered static HTML (no runtime computation or requests).
- Rebuilding unchanged source yields byte-identical output — the date must not depend on the build clock.

**Non-Goals:**
- Version numbers, commit hashes, or changelog links in the UI (the CI zip already records provenance for self-hosters).
- Per-page dates or dates on the acknowledgements page.

## Decisions

**D1 — Date source is the built revision's HEAD committer date (`git log -1 --format=%cs`), not the build clock.** A `new Date()` at build time would make every rebuild byte-different, so every CI run would churn the service-worker cache hash and show users an update prompt with nothing behind it. The committer date is a pure function of the built revision: same source → same bytes → no spurious update cycle. Day granularity (`%cs` → `YYYY-MM-DD`) also means several same-day commits with no other byte changes stay identical. Alternative — `SOURCE_DATE_EPOCH`-style env injection — rejected as more machinery for the same result.

**D2 — Injection via a Vite `transformIndexHtml` plugin substituting a literal placeholder token.** `index.html` carries `data-placeholder` markup with a `__LAST_UPDATED__` token in the `<time>` element's `datetime` attribute and text; the plugin replaces the token wherever it appears in the HTML. Unlike `define` (which only touches JS), this keeps the date in static HTML — visible without JS and correctly covered by the precache hash. The plugin is not `apply: "build"`-restricted, so the dev server shows the real date too and the placeholder can never leak to users. Resolution happens once at config evaluation via `execSync`, mirroring how the config already uses Node APIs.

**D3 — Git-unavailable fallback: build proceeds with the current UTC date and a printed warning.** Building outside a checkout (e.g. an exported source tarball) is an unsupported-but-possible path; failing the build over a footer nicety would be disproportionate. The warning makes the reproducibility loss visible to whoever owns that build.

**D4 — Placement and styling: a `.last-updated` paragraph inside `.footer-meta`, styled like the muted `.local-note`.** It is informational text, not an action, so it sits with the other footer metadata rather than in the action-bar button group.

## Risks / Trade-offs

- [Commit date, not deploy date: a deploy of an old revision shows the old date] → Correct behavior for "when did this content last change"; deploy provenance for operators lives in the CI zip already.
- [`execSync` at config time runs on every Vite invocation] → One `git log -1` is milliseconds; no caching needed.
- [A commit that changes nothing user-visible still updates the date on the next deploy] → Acceptable: the date tracks the revision, and any new deploy is byte-different anyway (hashed asset names), so this adds no extra update-prompt churn.

## Migration Plan

Ships as a normal deploy; no data or spec migrations beyond the ADDED footer requirement in `memo-editor`.

## Open Questions

None.
