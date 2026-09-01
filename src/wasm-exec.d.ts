/**
 * Ambient types for the vendored Go wasm runtime (vendor/vale/wasm_exec.js),
 * which is a plain script: evaluating it defines the global `Go` class, and
 * it reads/installs the global `fs` object the Go runtime does I/O through
 * (lint-fs.ts installs ours first).
 */

declare module "*/wasm_exec.js";

declare class Go {
  argv: string[];
  env: Record<string, string>;
  exit: (code: number) => void;
  readonly importObject: WebAssembly.Imports;
  run(instance: WebAssembly.Instance): Promise<void>;
}

// eslint-disable-next-line no-var
declare var fs: unknown;
