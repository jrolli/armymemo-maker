/**
 * Main-thread RPC client for the lint worker, mirroring compile-client
 * (design D2/D4 of add-vale-prose-linting). The worker spawns lazily on the
 * first lint request; a worker-level error rejects everything pending and
 * the next call respawns a fresh worker, so a Go runtime crash degrades to
 * per-request failures the callers render as "prose check unavailable".
 */
import type { Finding, LintFormat, LintWorkerCall, LintWorkerResponse } from "./lint-worker";

export type { Finding, LintFormat };

interface Pending {
  resolve: (result: Finding[]) => void;
  reject: (error: Error) => void;
}

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./lint-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<LintWorkerResponse>) => {
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
      const failure = new Error(event.message || "lint worker failed");
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

export function lintProse(source: string, format: LintFormat): Promise<Finding[]> {
  const message: LintWorkerCall & { id: number } = { op: "lint", source, format, id: nextId++ };
  return new Promise((resolve, reject) => {
    pending.set(message.id, { resolve, reject });
    getWorker().postMessage(message);
  });
}
