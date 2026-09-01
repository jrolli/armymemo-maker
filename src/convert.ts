/**
 * Drop-a-file conversion page (add-file-compile-page): one gesture — drop or
 * pick a memo source file — compiles it with the shared worker pipeline and
 * immediately downloads the resulting PDF, named after the source file with
 * the extension swapped to `.pdf` (design D2-D5). The extension selects the
 * interpretation (design D4 of add-markdown-input): `.md`/`.markdown` files
 * are converted from Markdown to Typst first; everything else is Typst.
 */
import "./style.css";
import { compileToPdf, addFields } from "./compile-client";
import { deriveConvertedFilename } from "./download-filename";
import { convertMarkdownMemo, isMarkdownFilename, MarkdownConversionError } from "./markdown";
import { createLintPresenter } from "./findings-view";

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) {
    throw new Error(`element #${id} missing or wrong type`);
  }
  return found;
}

const dropZone = element("drop-zone", HTMLLabelElement);
const fileInput = element("file-input", HTMLInputElement);
const status = element("convert-status", HTMLParagraphElement);
const diagnosticsPane = element("diagnostics", HTMLPreElement);
const lintPresenter = createLintPresenter(
  element("prose-findings", HTMLDivElement),
  element("prose-findings-title", HTMLHeadingElement),
  element("prose-findings-list", HTMLUListElement),
  { hideWhilePending: true },
);

function showStatus(text: string, options: { warn?: boolean } = {}) {
  status.classList.toggle("convert-status--warn", options.warn === true);
  status.textContent = text;
  status.hidden = false;
  diagnosticsPane.hidden = true;
}

function showDiagnostics(text: string) {
  diagnosticsPane.textContent = text;
  diagnosticsPane.hidden = false;
}

function download(pdf: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([pdf.slice().buffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Signable-vs-plain policy, same as the editor's toOutputPdf (design D4):
 * apply fields when a valid non-empty manifest exists, otherwise fall back to
 * the plain PDF with a visible reason. Returns the bytes to download plus the
 * outcome line for the status area.
 */
async function toOutputPdf(
  outcome: Extract<Awaited<ReturnType<typeof compileToPdf>>, { ok: true }>,
): Promise<{ pdf: Uint8Array; message: string; warn: boolean }> {
  const extraction = outcome.fields;
  if ("error" in extraction) {
    return {
      pdf: outcome.pdf,
      message: `Signature field problem: ${extraction.error} — downloaded the plain PDF`,
      warn: true,
    };
  }
  if (extraction.fields.length === 0) {
    return {
      pdf: outcome.pdf,
      message: "No signature fields — downloaded a plain (non-signable) PDF",
      warn: false,
    };
  }
  const names = extraction.fields.map((field) => field.name).join(", ");
  const plural = extraction.fields.length === 1 ? "" : "s";
  // Signature-centric wording while that's all armymemo emits, generic once
  // other field types appear (design D4 of update-armymemo-eform).
  const allSignature = extraction.fields.every(
    (field) => field.type === undefined || field.type === "signature",
  );
  const noun = allSignature ? "signature field" : "form field";
  const summary = `${extraction.fields.length} ${noun}${plural}: ${names}`;
  try {
    const signable = await addFields(outcome.pdf, extraction.fields);
    return { pdf: signable, message: `${summary} — downloaded a signable PDF`, warn: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      pdf: outcome.pdf,
      message: `${summary} — eform failed: ${message} — downloaded the plain PDF`,
      warn: true,
    };
  }
}

// Single-flight: a conversion in progress ignores further drops/picks rather
// than interleaving two downloads.
let converting = false;

async function convertFile(file: File) {
  if (converting) {
    return;
  }
  converting = true;
  dropZone.classList.add("drop-zone--busy");
  showStatus(`Compiling ${file.name}…`);
  try {
    let source = await file.text();
    // Prose lint of the file as provided (design D4 of
    // add-vale-prose-linting): a parallel side-channel that never gates the
    // compile-and-download flow — its findings render under the outcome
    // status whenever they arrive, including alongside a failure report.
    lintPresenter.request(source, isMarkdownFilename(file.name) ? "md" : "typ");
    // Extension dispatch (design D4 of add-markdown-input): a Markdown memo
    // is converted to Typst first, then flows through the same pipeline.
    if (isMarkdownFilename(file.name)) {
      try {
        source = convertMarkdownMemo(source);
      } catch (error) {
        if (!(error instanceof MarkdownConversionError)) {
          throw error;
        }
        showStatus(`${file.name} did not convert — nothing downloaded`, { warn: true });
        showDiagnostics(error.message);
        return;
      }
    }
    const outcome = await compileToPdf(source);
    if (!outcome.ok) {
      showStatus(`${file.name} did not compile — nothing downloaded`, { warn: true });
      showDiagnostics(outcome.diagnostics);
      return;
    }
    const output = await toOutputPdf(outcome);
    const filename = deriveConvertedFilename(file.name);
    download(output.pdf, filename);
    showStatus(`${filename}: ${output.message}`, { warn: output.warn });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showStatus(`Conversion failed: ${message}`, { warn: true });
  } finally {
    converting = false;
    dropZone.classList.remove("drop-zone--busy");
  }
}

function takeSingleFile(files: FileList | File[] | null | undefined): File | undefined {
  const list = files ? [...files] : [];
  if (list.length !== 1) {
    showStatus(
      list.length === 0
        ? "No file received — drop a Typst or Markdown memo file or click to browse"
        : `${list.length} files received — drop exactly one Typst or Markdown memo file`,
      { warn: true },
    );
    return undefined;
  }
  return list[0];
}

fileInput.addEventListener("change", () => {
  const file = takeSingleFile(fileInput.files);
  // Clear the selection so re-choosing the same file fires change again.
  fileInput.value = "";
  if (file) {
    void convertFile(file);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("drop-zone--over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drop-zone--over");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("drop-zone--over");
  const file = takeSingleFile(event.dataTransfer?.files);
  if (file) {
    void convertFile(file);
  }
});

// Registration only — update surfacing (the waiting-worker button and
// SKIP_WAITING promotion) lives solely on the editor page, so this page can
// never trigger a reload. Registering here means a direct visit to the
// conversion page is enough to make the whole app work offline.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      // Registration failure just means no offline capability this visit.
    });
  });
}
