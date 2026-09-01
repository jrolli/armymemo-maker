/**
 * Dedicated prose-lint worker (design D2 of add-vale-prose-linting): hosts
 * the Vale Go/WASM runtime behind the in-memory fs shim, isolated from the
 * compile worker in both directions — a Go panic never strands a compile,
 * and lint requests never queue behind one.
 *
 * Import order is load-bearing: lint-fs must evaluate (installing
 * globalThis.fs) before wasm_exec.js does, or the runtime gets the stub fs.
 * Each lint run executes the Vale CLI's main() afresh — Go wasm programs
 * exit — against a freshly instantiated module; the compiled module is
 * cached from the first request (lazy, so this ~9.5 MB fetch never competes
 * with the compiler WASM for first-paint bandwidth).
 */
import { setFile, removeFile, resetOutput, takeStdout, takeStderr } from "./lint-fs";
import "../vendor/vale/wasm_exec.js";
import valeWasmUrl from "../vendor/vale/vale.wasm.gz?url";
import valeIni from "../vendor/vale/vale.ini?raw";
import { fetchMaybeGzipped } from "./gzip-fetch";
import { parseFindings, type Finding, type LintFormat } from "./lint-findings";

export type { Finding, LintFormat };

export type LintWorkerCall = { op: "lint"; source: string; format: LintFormat };
export type LintWorkerRequest = LintWorkerCall & { id: number };
export type LintWorkerResponse =
  | { id: number; ok: true; result: Finding[] }
  | { id: number; ok: false; error: string };

const encoder = new TextEncoder();

// Seed the fixed tree once: config plus every style file, bundled into this
// chunk as raw strings so the worker needs exactly one asset fetch (the
// module itself).
setFile("/vale.ini", encoder.encode(valeIni));
const styleFiles = import.meta.glob("../vendor/vale/styles/memo/*.yml", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
for (const [path, content] of Object.entries(styleFiles)) {
  setFile(`/styles/memo/${path.split("/").pop()}`, encoder.encode(content));
}

let modulePromise: Promise<WebAssembly.Module> | undefined;

function getModule(): Promise<WebAssembly.Module> {
  modulePromise ??= WebAssembly.compileStreaming(fetchMaybeGzipped(valeWasmUrl, "Vale WASM"));
  return modulePromise;
}

async function lint(source: string, format: LintFormat): Promise<Finding[]> {
  const docPath = `/doc.${format}`;
  const module = await getModule();
  removeFile("/doc.md");
  removeFile("/doc.typ");
  setFile(docPath, encoder.encode(source));
  resetOutput();

  const go = new Go();
  go.argv = ["vale", "--no-exit", "--config=/vale.ini", "--output=JSON", docPath];
  go.env = { HOME: "/" };
  let exitCode = 0;
  go.exit = (code) => {
    exitCode = code;
  };
  const instance = await WebAssembly.instantiate(module, go.importObject);
  await go.run(instance);

  const stdout = takeStdout();
  if (exitCode !== 0) {
    const stderr = takeStderr();
    throw new Error(`vale exited with code ${exitCode}: ${(stderr || stdout).slice(0, 200)}`);
  }
  return parseFindings(stdout, docPath);
}

// Serialize runs: the fs shim's document slot and output capture are shared
// state, and two Go instances interleaving on the microtask queue would race
// on them. Requests still answer in arrival order.
let queue: Promise<unknown> = Promise.resolve();

self.onmessage = (event: MessageEvent<LintWorkerRequest>) => {
  const request = event.data;
  queue = queue
    .then(() => lint(request.source, request.format))
    .then(
      (result) => {
        self.postMessage({ id: request.id, ok: true, result } satisfies LintWorkerResponse);
      },
      (error: unknown) => {
        self.postMessage({
          id: request.id,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies LintWorkerResponse);
      },
    );
};
