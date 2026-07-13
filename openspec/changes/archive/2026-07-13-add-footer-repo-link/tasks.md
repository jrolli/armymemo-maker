## 1. Implementation

- [x] 1.1 Add the repository anchor (`https://github.com/jrolli/armymemo-maker`, `target="_blank"`, `rel="noopener noreferrer"`) to the footer in `index.html`
- [x] 1.2 Style the link in `src/style.css` to sit cleanly beside the `.local-note` text at desktop and narrow widths
- [x] 1.3 Add the exact repository URL to `ALLOWED_PREFIXES` in `scripts/check-local-only.mjs` with a navigation-only rationale comment

## 2. Verification

- [x] 2.1 `npm run build` passes (typecheck, local-only, precache, and asset-size checks all green)
- [x] 2.2 In `npm run preview`, confirm the footer link renders, opens the repository in a new tab, and the page load makes no requests to any non-self origin (browser devtools network panel or the existing Playwright same-origin assertion approach)
