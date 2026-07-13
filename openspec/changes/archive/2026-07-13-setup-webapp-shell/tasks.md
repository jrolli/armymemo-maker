# Tasks: setup-webapp-shell

## 1. Project scaffold

- [x] 1.1 Initialize the repo: `package.json`, Vite + TypeScript (strict) scaffold, `.gitignore`, and `npm run dev` / `build` / `preview` scripts
- [x] 1.2 Add a README covering install, dev, build, preview, and the local-only architecture contract (including the pinned armymemo version note from design D4)

## 2. UI shell

- [x] 2.1 Build the two-pane CSS Grid layout: editor pane, output pane with empty-state message, and action bar with disabled Compile and Download controls (tooltip/aria state indicating not yet available)
- [x] 2.2 Implement the `Editor` module wrapping a styled `<textarea>` with `getSource()` / `setSource()` / `onChange()` per design D2
- [x] 2.3 Verify the layout stays usable (no overlap/clipping) at narrow viewport widths

## 3. Starter example

- [x] 3.1 Author `src/assets/example.typ` — a minimal valid armymemo document with a version-pinned `#import "@preview/armymemo:..."` line
- [x] 3.2 Load the example via Vite `?raw` import and pre-fill the editor on first load

## 4. Local-only enforcement

- [x] 4.1 Add the CSP meta tag (`default-src 'self'` baseline) to `index.html` and adjust Vite build options until the production bundle runs clean under it (resolves design open question on exact directives)
- [x] 4.2 Implement `npm run check:local-only` — script that scans `dist/` for external `http(s)://` origin references and fails with the offending file and match
- [x] 4.3 Wire the check into the build flow (`npm run build` runs it or a combined `check` script documented in the README)

## 5. Verification

- [x] 5.1 Build from a clean checkout, serve `dist/` with `python -m http.server`, and confirm the app is fully functional with the browser network panel showing only same-origin requests
- [x] 5.2 Confirm all spec scenarios pass: source fidelity (paste round-trip), example pre-fill and replacement, disabled actions unreachable by mouse and keyboard, dev hot reload, preview serving
