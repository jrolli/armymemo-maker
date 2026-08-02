/**
 * eform WASM wrapper (design D2): lazy same-origin init, manifest encoding.
 * The vendored module is built from a pinned jrolli/eform commit by
 * scripts/vendor-eform.sh.
 */
import init, { add_fields } from "../vendor/eform/eform.js";
import eformWasmUrl from "../vendor/eform/eform_bg.wasm?url";
import type { FormField } from "./typst-service";

let initPromise: Promise<unknown> | undefined;

/**
 * Apply form fields to a compiled PDF. Throws with eform's human-readable
 * message on failure (malformed PDF, invalid manifest, ...).
 */
export async function addFields(pdf: Uint8Array, fields: FormField[]): Promise<Uint8Array> {
  // Explicit wasm URL: wasm-bindgen's import.meta.url default breaks under
  // bundling; the ?url import keeps the asset same-origin and hashed.
  initPromise ??= init({ module_or_path: eformWasmUrl });
  await initPromise;
  const manifest = new TextEncoder().encode(JSON.stringify(fields));
  return add_fields(pdf, manifest);
}
