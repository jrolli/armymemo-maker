/**
 * esign WASM wrapper (design D2): lazy same-origin init, manifest encoding.
 * The vendored module is built from a pinned jrolli/esign commit by
 * scripts/vendor-esign.sh.
 */
import init, { add_fields } from "../vendor/esign/esign.js";
import esignWasmUrl from "../vendor/esign/esign_bg.wasm?url";
import type { SignatureField } from "./typst-service";

let initPromise: Promise<unknown> | undefined;

/**
 * Apply signature form fields to a compiled PDF. Throws with esign's
 * human-readable message on failure (malformed PDF, invalid manifest, ...).
 */
export async function addFields(pdf: Uint8Array, fields: SignatureField[]): Promise<Uint8Array> {
  // Explicit wasm URL: wasm-bindgen's import.meta.url default breaks under
  // bundling; the ?url import keeps the asset same-origin and hashed.
  initPromise ??= init({ module_or_path: esignWasmUrl });
  await initPromise;
  const manifest = new TextEncoder().encode(JSON.stringify(fields));
  return add_fields(pdf, manifest);
}
