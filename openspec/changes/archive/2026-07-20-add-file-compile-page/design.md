## Context

The editor page already owns the full pipeline: `src/compile-client.ts` RPCs into the compile worker (`compileToPdf`, `addFields`), field extraction happens inside the compile call, and `src/main.ts` decides between the signable and plain PDF. The acknowledgements page established the multi-page pattern: a second HTML entry in `vite.config.ts` `rollupOptions.input`, CSP injection and `__LAST_UPDATED__` substitution applied to every HTML entry by the existing plugins, and precaching for free because `generate-sw.mjs` walks `dist/`. This change adds a third entry that is interactive (unlike acknowledgements) but much smaller than the editor.

## Goals / Non-Goals

**Goals:**
- One-gesture conversion: drop (or pick) a `.typ` file → signable PDF downloads immediately.
- Output filename = source filename with the extension swapped to `.pdf`.
- Same local-only, offline, CSP-covered delivery as every other page.

**Non-Goals:**
- No preview, no editing, no draft persistence on this page — the editor page already does that.
- No multi-file/batch conversion.
- No changes to the compiler, esign, or worker protocol.

## Decisions

**D1 — Separate HTML entry with its own small entry script.** `convert.html` + `src/convert.ts`, added to `rollupOptions.input` beside `main` and `acknowledgements`. The page imports `src/style.css` and `src/compile-client.ts` only, so the compiler module graph stays in the worker exactly as on the editor page. Alternative — a mode of the editor page — rejected: the editor's draft-persistence and auto-compile wiring would fight a fire-and-forget flow, and a separate page keeps both simple.

**D2 — File intake is a `<label>` drop zone wrapping a hidden `<input type="file" accept=".typ,text/plain">`.** The label gives click-to-browse and keyboard/screen-reader activation natively; `dragover`/`drop` handlers on the zone add drag-and-drop. Drop bypasses `accept` filtering by design, so the page never rejects by extension — any dropped file is read as UTF-8 text and handed to the compiler, which produces real diagnostics for non-Typst content. Exactly one file per gesture: multiple files produce a visible error and no compile (silently picking one risks converting the wrong document).

**D3 — Output filename from the source filename, not the subject.** Strip the final extension from the source file's name (a name with no extension is used whole), sanitize the stem with the same character rules as `download-filename.ts` (filesystem-unsafe characters removed, whitespace collapsed, length bounded), append `.pdf`; an empty result falls back to `memo.pdf`. The subject-derived name stays editor-only — the user's request here is explicitly "same name, different extension". The sanitizer is shared by exporting a `sanitizeFilenameStem` helper from `download-filename.ts` rather than duplicating the rules.

**D4 — The signable-vs-plain decision is replicated, not extracted.** `convert.ts` calls `compileToPdf`, then `addFields` when a valid non-empty manifest exists, falling back to the plain PDF on esign failure — the same policy as `main.ts`'s `toOutputPdf`, but reported into this page's status area. Extracting the policy into a shared module was considered and rejected: it is ~15 lines around two RPC calls, and the two pages report outcomes differently enough (status line + manifest dataset vs. one-shot result line) that a shared abstraction would be parameter soup.

**D5 — Download fires from the same task chain as the drop/change event.** The object-URL + `a.click()` download runs after awaiting the compile promises; compile errors show diagnostics and download nothing, esign failure downloads the plain PDF with a visible warning (mirroring the editor's never-strand-the-user rule). Each conversion revokes its object URL after the click.

**D6 — Delivery needs no new machinery.** `generate-sw.mjs` precaches whatever is in `dist/`, `check-precache`/`check-local-only`/`check-asset-size` walk `dist/`, and the CSP/last-updated plugins hook `transformIndexHtml` for all entries — so the only build change is the one `input` line. The landing page footer links to `/convert.html`; the convert page links back to `/`.

## Risks / Trade-offs

- **Programmatic `a.click()` downloads without a user gesture in the same tick** → the click happens in the async continuation of a real user gesture (drop or file-picker change); all evergreen browsers permit anchor-download there. Verified in the browser suite.
- **Duplicated signable-vs-plain policy (D4) could drift from the editor's** → both pages sit on the same worker RPCs, and the spec scenarios for this page assert the same fallback behavior, so drift shows up as a spec violation, not silent divergence.
- **A second page spawns its own compile worker (~11 MB WASM load) on first use** → same lazy-load cost the editor already pays; served from the precache after first visit. No shared-worker complexity is warranted.
