/**
 * In-browser Typst compilation service (design D1/D3/D4/D7).
 *
 * Everything resolves same-origin: the compiler WASM, the Liberation Sans
 * fonts, and the vendored armymemo package archive. The vendored package
 * resolves under both `@local/armymemo` (the preferred form — armymemo is not
 * on Typst Universe) and `@preview/armymemo` (compatibility with existing
 * drafts); anything else fails with a normal "package not found" diagnostic,
 * which is the local-only contract working as intended.
 */
import { $typst, TypstSnippet } from "@myriaddreamin/typst.ts/contrib/snippet";
import { CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";
import { MemoryAccessModel } from "@myriaddreamin/typst.ts/fs/memory";
import { FetchPackageRegistry } from "@myriaddreamin/typst.ts/fs/package";
import type { PackageResolveContext, PackageSpec } from "@myriaddreamin/typst.ts/internal.types";
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import { fetchMaybeGzipped, looksGzipped } from "./gzip-fetch";
import armymemoTarballUrl from "../vendor/armymemo-0.2.3.tar.gz?url";
import fontSansUrl from "./assets/fonts/LiberationSans-Regular.ttf?url";
import fontSansBoldUrl from "./assets/fonts/LiberationSans-Bold.ttf?url";
import fontSansItalicUrl from "./assets/fonts/LiberationSans-Italic.ttf?url";
import fontSansBoldItalicUrl from "./assets/fonts/LiberationSans-BoldItalic.ttf?url";

/**
 * One eform manifest entry: PDF points, top-left origin, 1-indexed page.
 * `type` selects the field kind (absent means signature); per-type option
 * keys (a signature's `lock`, text/checkbox options) ride along verbatim —
 * eform is the authority on their validity (design D3).
 */
export interface FormField {
  name: string;
  type?: "signature" | "text" | "checkbox";
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  [option: string]: unknown;
}

/** Extraction result: a valid manifest, or why none could be retained. */
export type FieldExtraction = { fields: FormField[] } | { error: string };

export type CompileOutcome =
  | { ok: true; pdf: Uint8Array; fields: FieldExtraction }
  | { ok: false; diagnostics: string };

const MAIN_FILE = "/main.typ";
const COMPILE_FONT = "Liberation Sans";

interface Diagnostic {
  package: string;
  path: string;
  severity: string;
  range: string;
  message: string;
}

let initPromise: Promise<void> | undefined;

/**
 * Fetch the compiler WASM, inflating it when it arrives gzipped (design D4 of
 * compress-compiler-wasm; sniffing logic shared with the Vale loader via
 * gzip-fetch). The production build ships the ~27 MiB module as .wasm.gz;
 * dev serves it raw from node_modules. The returned Response streams into
 * WebAssembly.instantiateStreaming via wasm-bindgen.
 */
function fetchCompilerModule(): Promise<Response> {
  return fetchMaybeGzipped(compilerWasmUrl, "compiler WASM");
}

/**
 * Fetch the vendored armymemo tarball, restoring the gzip layer when the
 * delivery path stripped it (design D1 of fix-dev-tarball-encoding). Servers
 * that infer Content-Encoding from the .gz extension — Vite's dev server
 * among them — make the browser inflate the body in transit, but typst.ts's
 * package loader requires the gzipped bytes.
 */
async function fetchArmymemoTarball(): Promise<Uint8Array> {
  const response = await fetch(armymemoTarballUrl);
  if (!response.ok) {
    throw new Error(`failed to load vendored armymemo package (${response.status})`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (looksGzipped(bytes)) {
    return bytes;
  }
  // Same lib.dom variance workaround as the DecompressionStream in gzip-fetch.
  const gzip = new CompressionStream("gzip") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>;
  const regzipped = new Response(new Response(bytes).body!.pipeThrough(gzip));
  return new Uint8Array(await regzipped.arrayBuffer());
}

/**
 * Package registry for the vendored armymemo archive (design D1/D2 of
 * prefer-local-namespace). The base FetchPackageRegistry only ever resolves
 * the `preview` namespace, so accepting `@local` requires owning resolve():
 * both namespaces are normalized to `preview` before delegating, which reuses
 * the base class's untar/cache logic and collapses both spellings onto one
 * unpacked copy — the compiler consumes the returned directory handle, not
 * the namespace embedded in it. Every other spec falls through to undefined,
 * i.e. the standard "package not found" diagnostic.
 */
class VendoredPackageRegistry extends FetchPackageRegistry {
  constructor(
    am: MemoryAccessModel,
    private tarball: Uint8Array,
  ) {
    super(am);
  }

  override pullPackageData(spec: PackageSpec): Uint8Array | undefined {
    return spec.name === "armymemo" && spec.version === "0.2.3" ? this.tarball : undefined;
  }

  override resolve(spec: PackageSpec, context: PackageResolveContext): string | undefined {
    if (spec.namespace !== "local" && spec.namespace !== "preview") {
      return undefined;
    }
    return super.resolve({ ...spec, namespace: "preview" }, context);
  }
}

async function initOnce(): Promise<void> {
  initPromise ??= (async () => {
    const armymemoTarball = await fetchArmymemoTarball();

    $typst.setCompilerInitOptions({ getModule: () => fetchCompilerModule() });

    const accessModel = new MemoryAccessModel();
    $typst.use(
      TypstSnippet.disableDefaultFontAssets(),
      TypstSnippet.preloadFonts([fontSansUrl, fontSansBoldUrl, fontSansItalicUrl, fontSansBoldItalicUrl]),
      TypstSnippet.withAccessModel(accessModel),
      TypstSnippet.withPackageRegistry(new VendoredPackageRegistry(accessModel, armymemoTarball)),
    );

    // Force compiler creation now so init failures surface here, not mid-compile.
    await $typst.getCompiler();
  })();
  return initPromise;
}

const FIELD_TYPES = ["signature", "text", "checkbox"];

function validateManifest(raw: unknown): FieldExtraction {
  if (!Array.isArray(raw)) {
    return { error: `expected a list of fields, got ${typeof raw}` };
  }
  const fields: FormField[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of raw.entries()) {
    const at = (name: string) => `field ${name ? `"${name}"` : `#${index + 1}`}`;
    if (typeof entry !== "object" || entry === null) {
      return { error: `${at("")} is not an object` };
    }
    const { name, type, page, x, y, w, h } = entry as Record<string, unknown>;
    if (typeof name !== "string" || name.length === 0) {
      return { error: `${at("")} has a missing or empty name` };
    }
    if (seen.has(name)) {
      return { error: `duplicate field name "${name}"` };
    }
    if (type !== undefined && (typeof type !== "string" || !FIELD_TYPES.includes(type))) {
      return { error: `${at(name)} has unknown type ${JSON.stringify(type)}` };
    }
    if (typeof page !== "number" || !Number.isInteger(page) || page < 1) {
      return { error: `${at(name)} has invalid page ${JSON.stringify(page)}` };
    }
    if (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y)) {
      return { error: `${at(name)} has non-finite coordinates` };
    }
    if (typeof w !== "number" || !(w > 0) || typeof h !== "number" || !(h > 0)) {
      return { error: `${at(name)} has non-positive size` };
    }
    seen.add(name);
    // Retain the entry verbatim: per-type option keys (lock, max_len, ...)
    // must reach eform, which validates the full schema itself (design D3).
    fields.push(entry as FormField);
  }
  return { fields };
}

function formatDiagnostics(diagnostics: Diagnostic[]): string {
  return diagnostics
    .map((d) => {
      const location = d.path ? ` at ${d.path}${d.range ? `:${d.range}` : ""}` : "";
      return `${d.severity}: ${d.message}${location}`;
    })
    .join("\n");
}

export async function compileToPdf(source: string): Promise<CompileOutcome> {
  try {
    await initOnce();
    const compiler = await $typst.getCompiler();
    await compiler.addSource(MAIN_FILE, source);
    const { result, diagnostics } = await compiler.compile({
      mainFilePath: MAIN_FILE,
      format: CompileFormatEnum.pdf,
      diagnostics: "full",
      inputs: { font: COMPILE_FONT },
    });
    if (result) {
      // Same inputs as the PDF pass: coordinates must come from the same
      // layout (fonts affect metrics). An extraction failure never voids the
      // compiled PDF (design D2).
      let fields: FieldExtraction;
      try {
        // TypstCompiler.query/$typst.query snapshot a world without compiling
        // it ("document is not compiled"); go through runWithWorld and compile
        // the paged document explicitly before querying.
        const raw = await compiler.runWithWorld(
          { mainFilePath: MAIN_FILE, inputs: { font: COMPILE_FONT } },
          async (world) => {
            const paged = await world.compile();
            if (paged.hasError) {
              throw new Error("query pass failed to compile the document");
            }
            return world.query({ selector: "<eform-field>", field: "value" });
          },
        );
        fields = validateManifest(raw);
      } catch (error) {
        fields = { error: error instanceof Error ? error.message : String(error) };
      }
      return { ok: true, pdf: result, fields };
    }
    const errors = (diagnostics as Diagnostic[] | undefined) ?? [];
    return {
      ok: false,
      diagnostics: errors.length > 0 ? formatDiagnostics(errors) : "compilation failed with no diagnostics",
    };
  } catch (error) {
    return { ok: false, diagnostics: error instanceof Error ? error.message : String(error) };
  }
}
