## 1. Shared filename helper

- [x] 1.1 In `src/download-filename.ts`, extract the stem sanitization (unsafe-character removal, whitespace collapse/trim, length bound) into an exported `sanitizeFilenameStem(stem: string): string` used by `deriveDownloadFilename`, and add `deriveConvertedFilename(sourceName: string): string` that strips the final extension, sanitizes, appends `.pdf`, and falls back to `memo.pdf` on an empty stem (design D3)

## 2. Conversion page

- [x] 2.1 Create `convert.html`: header matching the site, a single large drop-zone `<label>` wrapping a visually-hidden `<input type="file" accept=".typ,text/plain">`, a status/diagnostics area, a footer with a link back to `/` plus the standard footer meta (local note, `__LAST_UPDATED__` timestamp, acknowledgements/GitHub links), and a module script tag for `src/convert.ts` (design D1/D2)
- [x] 2.2 Create `src/convert.ts`: wire drag-over/drop and input-change handlers (exactly one file, multiple-file drops report an error and skip compiling), read the file as UTF-8 text, compile via `compileToPdf`, apply fields via `addFields` with the editor's signable-vs-plain fallback policy reported into the status area, and on success trigger an immediate download named by `deriveConvertedFilename`, revoking the object URL afterward; compile failure shows diagnostics and downloads nothing, and a later success clears the error state (design D4/D5)
- [x] 2.3 Style the drop zone and status area in `src/style.css` (idle, drag-over highlight, busy, error states), reusing the existing pane/action-bar visual language

## 3. Integration

- [x] 3.1 Add the `convert` entry to `build.rollupOptions.input` in `vite.config.ts` (design D6)
- [x] 3.2 Add a clearly labeled link to the conversion page on the landing page (`index.html` footer nav)

## 4. Verification

- [x] 4.1 `npm run build` passes (typecheck plus acknowledgements, local-only, precache, and asset-size checks) with the new entry, and `dist/sw.js` precaches `/convert.html` and its assets
- [x] 4.2 Ad-hoc Playwright check against a static server serving `dist/`: choosing a valid armymemo `.typ` file via the file input downloads a signable PDF named after the source file with a `.pdf` extension; an invalid source shows diagnostics and downloads nothing; a following valid file downloads and clears the error
- [x] 4.3 Confirm the multiple-file drop path reports an error without compiling, and the landing-page link navigates to the conversion page (and back)
