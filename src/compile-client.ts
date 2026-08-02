/**
 * Main-thread RPC client for the compile worker (design D2 of
 * add-compile-worker). Same signatures as the underlying services; types are
 * imported type-only so the compiler module graph stays out of the main
 * bundle. The worker spawns lazily on first use; a worker-level error rejects
 * everything pending and the next call respawns a fresh worker.
 */
import type { CompileOutcome, FormField } from "./typst-service";
import type { WorkerCall, WorkerResponse } from "./compile-worker";

interface Pending {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./compile-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;
      const entry = pending.get(response.id);
      if (!entry) {
        return;
      }
      pending.delete(response.id);
      if (response.ok) {
        entry.resolve(response.result);
      } else {
        entry.reject(new Error(response.error));
      }
    };
    worker.onerror = (event) => {
      const failure = new Error(event.message || "compile worker failed");
      worker?.terminate();
      worker = undefined;
      const stranded = [...pending.values()];
      pending.clear();
      for (const entry of stranded) {
        entry.reject(failure);
      }
    };
  }
  return worker;
}

function request(message: WorkerCall): Promise<unknown> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ ...message, id });
  });
}

export function compileToPdf(source: string): Promise<CompileOutcome> {
  return request({ op: "compile", source }) as Promise<CompileOutcome>;
}

export function addFields(pdf: Uint8Array, fields: FormField[]): Promise<Uint8Array> {
  return request({ op: "add-fields", pdf, fields }) as Promise<Uint8Array>;
}
