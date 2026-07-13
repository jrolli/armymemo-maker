/**
 * Dedicated compile worker (design D1 of add-compile-worker): hosts the whole
 * WASM pipeline — Typst compile + field query + esign field application — so
 * the main thread never blocks on it. One instance; the page's single-flight
 * gate guarantees at most one request is in flight.
 */
import { compileToPdf, type SignatureField } from "./typst-service";
import { addFields } from "./esign-service";

export type WorkerCall =
  | { op: "compile"; source: string }
  | { op: "add-fields"; pdf: Uint8Array; fields: SignatureField[] };

export type WorkerRequest = WorkerCall & { id: number };

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    const result =
      request.op === "compile"
        ? await compileToPdf(request.source)
        : await addFields(request.pdf, request.fields);
    self.postMessage({ id: request.id, ok: true, result } satisfies WorkerResponse);
  } catch (error) {
    self.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies WorkerResponse);
  }
};
