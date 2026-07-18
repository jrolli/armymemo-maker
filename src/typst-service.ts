/**
 * In-browser Typst compilation service (design D1/D3/D4/D7).
 *
 * Everything resolves same-origin: the compiler WASM, the Liberation Sans
 * fonts, and the vendored armymemo package archive. Only vendored packages
 * resolve — anything else fails with a normal "package not found" diagnostic,
 * which is the local-only contract working as intended.
 */
import { $typst, TypstSnippet } from "@myriaddreamin/typst.ts/contrib/snippet";
import { CompileFormatEnum } from "@myriaddreamin/typst.ts/compiler";
import { MemoryAccessModel } from "@myriaddreamin/typst.ts/fs/memory";
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import armymemoTarballUrl from "../vendor/armymemo-0.1.0.tar.gz?url";
import fontSansUrl from "./assets/fonts/LiberationSans-Regular.ttf?url";
import fontSansBoldUrl from "./assets/fonts/LiberationSans-Bold.ttf?url";
import fontSansItalicUrl from "./assets/fonts/LiberationSans-Italic.ttf?url";
import fontSansBoldItalicUrl from "./assets/fonts/LiberationSans-BoldItalic.ttf?url";

export type CompileOutcome =
  | { ok: true; pdf: Uint8Array }
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

async function initOnce(): Promise<void> {
  initPromise ??= (async () => {
    const tarballResponse = await fetch(armymemoTarballUrl);
    if (!tarballResponse.ok) {
      throw new Error(`failed to load vendored armymemo package (${tarballResponse.status})`);
    }
    const armymemoTarball = new Uint8Array(await tarballResponse.arrayBuffer());

    $typst.setCompilerInitOptions({ getModule: () => compilerWasmUrl });

    const accessModel = new MemoryAccessModel();
    $typst.use(
      TypstSnippet.disableDefaultFontAssets(),
      TypstSnippet.preloadFonts([fontSansUrl, fontSansBoldUrl, fontSansItalicUrl, fontSansBoldItalicUrl]),
      TypstSnippet.withAccessModel(accessModel),
      TypstSnippet.fetchPackageBy(accessModel, (spec) =>
        spec.name === "armymemo" && spec.version === "0.1.0" ? armymemoTarball : undefined,
      ),
    );

    // Force compiler creation now so init failures surface here, not mid-compile.
    await $typst.getCompiler();
  })();
  return initPromise;
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
      return { ok: true, pdf: result };
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
