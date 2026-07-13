import { defineConfig, type Plugin } from "vite";

// Production CSP: everything must come from the site's own origin.
// Dev mode is intentionally uncovered — Vite's dev server injects styles and
// uses HMR websockets that a strict policy would fight; the local-only
// guarantee applies to the delivered bundle, which check-local-only.mjs and
// this header enforce together.
// NOTE for later changes: WASM (Typst compiler, esign) will require adding
// `'wasm-unsafe-eval'` to script-src. That is an expected, documented edit,
// not a weakening of the local-only contract.
const PRODUCTION_CSP = [
  "default-src 'self'",
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

export default defineConfig({
  plugins: [injectProductionCsp()],
  build: {
    // Keep output auditable for the local-only check: no inline assets.
    assetsInlineLimit: 0,
  },
});
