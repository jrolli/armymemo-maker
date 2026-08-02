import { defineConfig, type Plugin } from "vite";
import { execSync } from "node:child_process";
import { gzipSync } from "node:zlib";

// Production CSP: everything must come from the site's own origin.
// Dev mode is intentionally uncovered — Vite's dev server injects styles and
// uses HMR websockets that a strict policy would fight; the local-only
// guarantee applies to the delivered bundle, which check-local-only.mjs and
// this header enforce together.
// NOTE for later changes: WASM (Typst compiler, eform) will require adding
// `'wasm-unsafe-eval'` to script-src. That is an expected, documented edit,
// not a weakening of the local-only contract.
const PRODUCTION_CSP = [
  "default-src 'self'",
  // 'unsafe-eval' is required by the vendored Typst compiler WASM: its
  // js_sys::global() fallback evaluates Function("return this") at startup
  // (verified via securitypolicyviolation events; 'wasm-unsafe-eval' alone is
  // insufficient). 'unsafe-eval' also covers the WASM compilation itself.
  // Script *sources* remain 'self'; no external origin is ever loadable.
  "script-src 'self' 'unsafe-eval'",
  // The PDF preview iframe is a blob: document of locally-compiled bytes.
  "frame-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

function injectProductionCsp(): Plugin {
  return {
    name: "inject-production-csp",
    apply: "build",
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "meta",
            attrs: {
              "http-equiv": "Content-Security-Policy",
              content: PRODUCTION_CSP,
            },
            injectTo: "head-prepend",
          },
        ],
      };
    },
  };
}

// Footer "Updated YYYY-MM-DD" date (design D1/D2 of add-footer-last-updated):
// the HEAD committer date, NOT the build clock — the service-worker cache name
// hashes every emitted byte, so a clock-derived date would make each rebuild
// look like a new version and show users an empty update prompt. Runs in dev
// too (no `apply` restriction) so the placeholder can never reach a browser.
function lastUpdatedDate(): string {
  try {
    return execSync("git log -1 --format=%cs", { encoding: "utf8" }).trim();
  } catch {
    console.warn(
      "inject-last-updated: git commit date unavailable — falling back to the current date; " +
        "this build is not byte-reproducible.",
    );
    return new Date().toISOString().slice(0, 10);
  }
}

function injectLastUpdated(): Plugin {
  const date = lastUpdatedDate();
  return {
    name: "inject-last-updated",
    transformIndexHtml(html) {
      return html.replaceAll("__LAST_UPDATED__", date);
    },
  };
}

// The Typst compiler WASM is ~27 MiB raw, over the 25 MiB per-file cap that
// static hosts like Cloudflare enforce on uploads. Ship it gzipped (~11 MiB);
// the runtime loader in typst-service.ts inflates it via DecompressionStream
// (design D3/D4 of compress-compiler-wasm). The worker bundle references the
// asset as a plain URL string, so renaming means rewriting those strings in
// every emitted chunk/asset that carries one.
const COMPILER_WASM_PATTERN = /typst_ts_web_compiler_bg-[^/]+\.wasm$/;

function compressCompilerWasm(): Plugin {
  return {
    name: "compress-compiler-wasm",
    apply: "build",
    generateBundle(_options, bundle) {
      const matches = Object.keys(bundle).filter((name) => COMPILER_WASM_PATTERN.test(name));
      const oldName = matches[0];
      if (oldName === undefined || matches.length !== 1) {
        throw new Error(
          `compress-compiler-wasm: expected exactly one compiler .wasm asset, found ${matches.length}` +
            (matches.length > 0 ? ` (${matches.join(", ")})` : "") +
            " — did a typst.ts upgrade rename it?",
        );
      }
      const asset = bundle[oldName];
      if (asset === undefined || asset.type !== "asset" || typeof asset.source === "string") {
        throw new Error(`compress-compiler-wasm: ${oldName} is not a binary asset`);
      }
      const newName = `${oldName}.gz`;
      const compressed = gzipSync(asset.source, { level: 9 });
      delete bundle[oldName];
      this.emitFile({ type: "asset", fileName: newName, source: compressed });

      let rewritten = 0;
      for (const entry of Object.values(bundle)) {
        const content =
          entry.type === "chunk" ? entry.code : typeof entry.source === "string" ? entry.source : undefined;
        if (content === undefined || !content.includes(oldName)) continue;
        const updated = content.split(oldName).join(newName);
        if (entry.type === "chunk") {
          entry.code = updated;
        } else {
          entry.source = updated;
        }
        rewritten += 1;
      }
      if (rewritten === 0) {
        throw new Error(
          `compress-compiler-wasm: no emitted file references ${oldName} — cannot verify the URL rewrite`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [injectProductionCsp(), injectLastUpdated(), compressCompilerWasm()],
  // The compile worker's module graph (typst.ts) uses dynamic imports, which
  // the default iife worker format rejects (design D4 of add-compile-worker).
  worker: { format: "es" },
  build: {
    // Keep output auditable for the local-only check: no inline assets.
    assetsInlineLimit: 0,
    rollupOptions: {
      // Second HTML entry: the static acknowledgements page (generated by
      // scripts/generate-acknowledgements.mjs, committed). injectProductionCsp
      // covers it automatically — transformIndexHtml runs on every HTML entry.
      input: {
        main: new URL("./index.html", import.meta.url).pathname,
        acknowledgements: new URL("./acknowledgements.html", import.meta.url).pathname,
        convert: new URL("./convert.html", import.meta.url).pathname,
      },
    },
  },
});
