# Design: add-esign-signable-pdf

## Context

The pipeline compiles armymemo source to PDF and extracts a validated esign field manifest (`SignatureField[]`, held in app state and shown in the field status line). This change closes the loop: apply the manifest to the PDF with esign's WASM build so the download contains unsigned signature form fields usable in Adobe Acrobat/Foxit.

Upstream facts (verified against jrolli/esign):

- Release v0.1.0 ships CLI binaries only — **no prebuilt WASM artifact exists**. The WASM interface (`add_fields(pdfBytes, manifestBytes) → pdfBytes`, throws `Error` with the CLI's human-readable message) landed on `main` (crate v0.2.0, pinned commit `20de92305d74ff46a3eab3e173fca6348e5a1a9c`).
- The crate gates it behind a `wasm` feature (`wasm-bindgen 0.2.106`, `lopdf/wasm_js`), `crate-type = ["cdylib", "rlib"]`; upstream docs say `wasm-pack build --target web`.
- The manifest contract is the JSON array our extraction already produces, UTF-8 encoded.

## Goals / Non-Goals

**Goals:**

- When a compile yields a valid, non-empty manifest, produce the field-bearing PDF locally via esign WASM; preview and download serve it.
- Plain-PDF fallback with a visible indication whenever esign can't run or errors — the user is never left without a document.
- esign vendored same-origin, pinned, regenerable by script; app builds stay offline.

**Non-Goals:**

- Cryptographic signing (esign only places fields; signing happens in the user's PDF viewer).
- Multi-version esign support or dynamic selection; one pinned build.
- Changing the download filename (`memo.pdf` stays; a subject-derived name remains an open question from the compilation change).

## Decisions

### D1: Vendor esign WASM as committed artifacts built from source at a pinned commit

No prebuilt WASM exists, so `scripts/vendor-esign.sh` clones jrolli/esign at the pinned commit and builds with plain cargo + wasm-bindgen-cli:

1. `cargo build --release --target wasm32-unknown-unknown --features wasm`
2. `wasm-bindgen --target web --out-dir <repo>/vendor/esign target/wasm32-unknown-unknown/release/esign.wasm`

Outputs (`esign.js` glue, `esign_bg.wasm`, `.d.ts`) are committed under `vendor/esign/` alongside a provenance note (commit SHA, license). Like the armymemo tarball: network and toolchain at *maintenance* time only; app builds and runtime stay offline.

- *Alternative — wasm-pack as upstream documents:* currently uninstallable here (the project's GitHub releases are empty as of this writing); wasm-bindgen-cli pinned to the crate's exact `wasm-bindgen` version (0.2.106) produces the same artifacts minus the optional wasm-opt pass, whose size win we forgo.
- *Alternative — build during `npm run build`:* imposes a Rust toolchain on every contributor and breaks build reproducibility/offline-ness. Rejected (same reasoning as armymemo's D3).
- *Trade-off — committed generated artifacts:* accepted; they are small, pinned, and regenerated only by explicit script runs.

### D2: Lazy same-origin init; explicit wasm URL

`src/esign-service.ts` imports the vendored glue (`vendor/esign/esign.js`) and `esign_bg.wasm?url`, calling `init({ module_or_path: wasmUrl })` once on first use. The explicit URL matters: wasm-bindgen's default `new URL('esign_bg.wasm', import.meta.url)` resolution breaks under bundling; the `?url` import makes Vite emit and hash the asset same-origin. Service surface: `addFields(pdf: Uint8Array, fields: SignatureField[]) → Promise<Uint8Array>` (encodes `JSON.stringify(fields)` with `TextEncoder`), errors rethrown with esign's message.

### D3: Signable PDF replaces plain output when fields exist; fallback is visible, never silent

In the compile flow, after a successful compile with a valid non-empty manifest, the app calls esign; the resulting bytes become **the** output — preview iframe and Download both use them (preview-equals-download still holds; Chromium/Acrobat render the empty field boxes). On esign failure, preview/download keep the plain compiled PDF and the field status line reports the esign error (amber, same slot as extraction problems). Zero-field and invalid-manifest cases already show their own indications and now explicitly mean "plain PDF".

Field status becomes the single truth line: "2 signature fields: Signature, Concur1 — signable PDF ready" / "…plain (non-signable) PDF" / "Signature field problem: …" / "esign failed: … — download is the plain PDF".

### D4: No CSP or local-only changes needed

The esign WASM instantiates under the existing `'unsafe-eval'` allowance (it needs only `'wasm-unsafe-eval'`, which `'unsafe-eval'` subsumes) and loads same-origin; `check:local-only` scans the new assets like any other. Expectation: no new allowlist entries — esign has no embedded external URLs.

## Risks / Trade-offs

- [esign `main` is unreleased (v0.2.0-dev); behavior could shift under the pin] → The pin is a commit SHA, not a branch; verification exercises the real artifact end-to-end. Re-vendor deliberately when upstream tags a release.
- [wasm-bindgen-cli version drift vs. the crate's `wasm-bindgen` dependency] → The CLI must match esign's **Cargo.lock** resolution (0.2.126 at the pinned commit), not the Cargo.toml minimum (0.2.106) — discovered when the 0.2.106 CLI rejected the build. A mismatch fails loudly at vendor time, not at runtime; the script documents the lockfile rule.
- [Field coordinates disagree between armymemo (top-left, y-down) and PDF page space] → esign's manifest contract is defined in the same top-left convention armymemo emits (both sides documented and authored together); verification asserts the field annotation's rect lands on the page.
- [Browser PDF viewers may not visibly render empty AcroForm signature fields in the preview] → The contract is the downloaded file; verification asserts on bytes (AcroForm/Sig structures), not pixels.

## Migration Plan

Additive static-bundle deploy/rollback, as ever. The vendored esign artifacts version with the bundle.

## Open Questions

- Whether to run `wasm-opt` over the vendored binary for size once binaryen is conveniently available — cosmetic, deferred.
- Subject-derived download filename (carried over from the compilation change) — now trivially implementable via the query pass if wanted; still deferred as UX polish.
