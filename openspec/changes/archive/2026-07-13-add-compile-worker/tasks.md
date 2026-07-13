## 1. Module moves

- [x] 1.1 Move `deriveDownloadFilename` (and its constants) from `src/typst-service.ts` to a new pure `src/download-filename.ts`; update the `main.ts` import (design D3)

## 2. Worker and client

- [x] 2.1 Create `src/compile-worker.ts`: module-worker entry importing `typst-service`/`esign-service`, dispatching `{id, op}` messages for `compile` and `add-fields` with error marshalling (design D1)
- [x] 2.2 Create `src/compile-client.ts`: lazy worker creation, promise-per-request RPC with matching `compileToPdf`/`addFields` signatures, rejection on worker error events (design D2/D5)
- [x] 2.3 Point `main.ts` at `compile-client` instead of the services; orchestration unchanged
- [x] 2.4 Set `worker: { format: "es" }` in `vite.config.ts` (design D4)

## 3. Verification

- [x] 3.1 Headless-browser verify responsiveness: instrument main-thread event-loop gaps while a compile runs; typed characters appear promptly mid-compile and the long WASM block is gone from the main thread
- [x] 3.2 Re-run the auto-compile, filename, and draft persistence verification scripts against the worker build (behavior unchanged)
- [x] 3.3 Run `npm run build` cleanly (typecheck + local-only check covering the new worker chunks)
