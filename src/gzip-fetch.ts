/**
 * Gzip-sniffing asset fetch, shared by the Typst compiler and Vale WASM
 * loaders (design D4 of compress-compiler-wasm, extracted per design D2 of
 * add-vale-prose-linting). The production build ships large WASM modules as
 * .wasm.gz to stay under static-host per-file caps; dev serves them raw.
 * Sniffing the gzip magic bytes instead of the URL suffix keeps one code
 * path for both, and degrades to pass-through if a host serves .gz with
 * Content-Encoding so the browser has already inflated it. The returned
 * Response streams the inflated bytes.
 */

export const GZIP_MAGIC_0 = 0x1f;
export const GZIP_MAGIC_1 = 0x8b;

export function looksGzipped(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === GZIP_MAGIC_0 && bytes[1] === GZIP_MAGIC_1;
}

export async function fetchMaybeGzipped(url: string, what: string): Promise<Response> {
  const response = await fetch(url);
  if (!response.ok || response.body === null) {
    throw new Error(`failed to load ${what} (${response.status})`);
  }
  const reader = response.body.getReader();
  const first = await reader.read();
  const head = first.value ?? new Uint8Array(0);
  const rest = new ReadableStream<Uint8Array>({
    start(controller) {
      if (head.length > 0) controller.enqueue(head);
    },
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
      } else {
        controller.enqueue(value);
      }
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  // lib.dom types DecompressionStream's writable as WritableStream<BufferSource>,
  // which strict variance rejects in pipeThrough; at runtime the pair is
  // Uint8Array in, Uint8Array out.
  const gunzip = new DecompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
  const body = looksGzipped(head) ? rest.pipeThrough(gunzip) : rest;
  return new Response(body, { headers: { "Content-Type": "application/wasm" } });
}
