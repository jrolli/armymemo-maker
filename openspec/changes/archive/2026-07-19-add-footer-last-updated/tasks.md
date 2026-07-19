## 1. Build plugin

- [x] 1.1 In `vite.config.ts`, add an `injectLastUpdated` plugin: resolve the date once via `git log -1 --format=%cs` (fallback: current UTC date plus a printed warning), and replace the `__LAST_UPDATED__` token in every HTML transform; no `apply` restriction so dev and build both get the real date

## 2. Footer markup and styling

- [x] 2.1 Add `<p class="last-updated">Updated <time datetime="__LAST_UPDATED__">__LAST_UPDATED__</time></p>` to the `.footer-meta` block in `index.html`
- [x] 2.2 Style `.last-updated` in `src/style.css` to match the muted `.local-note` text

## 3. Verification

- [x] 3.1 `npm run build` passes all checks; `dist/index.html` contains the HEAD commit date and no `__LAST_UPDATED__` token anywhere in `dist/`
- [x] 3.2 Build twice and confirm the emitted `dist/index.html` bytes and service-worker cache name are identical across runs
- [x] 3.3 Confirm the dev server renders the real date (no placeholder leak) via `vite dev` + HTTP fetch
