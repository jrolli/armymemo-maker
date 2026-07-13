import "./style.css";
import { createEditor } from "./editor";
import { compileToPdf, addFields } from "./compile-client";
import { deriveDownloadFilename } from "./download-filename";
import type { SignatureField } from "./typst-service";
import { loadDraft, saveDraft } from "./draft-store";
import exampleSource from "./assets/example.typ?raw";

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) {
    throw new Error(`element #${id} missing or wrong type`);
  }
  return found;
}

const textarea = element("source-editor", HTMLTextAreaElement);
const compileButton = element("compile-button", HTMLButtonElement);
const downloadButton = element("download-button", HTMLButtonElement);
const emptyState = element("output-empty", HTMLDivElement);
const fieldStatus = element("field-status", HTMLParagraphElement);
const diagnosticsPane = element("diagnostics", HTMLPreElement);
const preview = element("pdf-preview", HTMLIFrameElement);

const editor = createEditor(textarea);
// Restore before wiring the save subscription so restoring never re-saves
// (design D3 of add-draft-persistence); blank drafts fall back to the example.
editor.setSource(loadDraft() ?? exampleSource);
editor.onChange(saveDraft);

let latestPdf: Uint8Array | undefined;
let latestFilename = "memo.pdf";
let latestFields: SignatureField[] | undefined;
let previewUrl: string | undefined;

function showFieldStatus(text: string, options: { warn?: boolean; manifest?: SignatureField[] } = {}) {
  fieldStatus.classList.toggle("field-status--warn", options.warn === true);
  if (options.manifest) {
    fieldStatus.dataset.manifest = JSON.stringify(options.manifest);
  } else {
    delete fieldStatus.dataset.manifest;
  }
  fieldStatus.textContent = text;
  fieldStatus.hidden = false;
}

/**
 * Produce the output PDF and its status line: signable via esign when a valid
 * non-empty manifest exists, otherwise the plain compiled PDF with a visible
 * reason (design D3 of add-esign-signable-pdf).
 */
async function toOutputPdf(outcome: Extract<Awaited<ReturnType<typeof compileToPdf>>, { ok: true }>) {
  const extraction = outcome.fields;
  if ("error" in extraction) {
    latestFields = undefined;
    showFieldStatus(`Signature field problem: ${extraction.error} — download is the plain PDF`, { warn: true });
    return outcome.pdf;
  }
  if (extraction.fields.length === 0) {
    latestFields = undefined;
    showFieldStatus("No signature fields — download will be a plain (non-signable) PDF");
    return outcome.pdf;
  }
  latestFields = extraction.fields;
  const names = extraction.fields.map((field) => field.name).join(", ");
  const plural = extraction.fields.length === 1 ? "" : "s";
  const summary = `${extraction.fields.length} signature field${plural}: ${names}`;
  try {
    const signable = await addFields(outcome.pdf, extraction.fields);
    showFieldStatus(`${summary} — signable PDF ready`, { manifest: extraction.fields });
    return signable;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFieldStatus(`${summary} — esign failed: ${message} — download is the plain PDF`, {
      warn: true,
      manifest: extraction.fields,
    });
    return outcome.pdf;
  }
}

function showPreview(pdf: Uint8Array) {
  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }
  previewUrl = URL.createObjectURL(new Blob([pdf.slice().buffer], { type: "application/pdf" }));
  preview.src = previewUrl;
  emptyState.hidden = true;
  diagnosticsPane.hidden = true;
  preview.hidden = false;
}

function showDiagnostics(text: string) {
  diagnosticsPane.textContent = text;
  emptyState.hidden = true;
  preview.hidden = true;
  diagnosticsPane.hidden = false;
}

async function compileOnce() {
  // Snapshot the source so the download filename always matches the bytes it
  // names, even if the editor has newer, uncompiled text (design D2 of
  // add-subject-download-filename).
  const source = editor.getSource();
  const outcome = await compileToPdf(source);
  if (outcome.ok) {
    const outputPdf = await toOutputPdf(outcome);
    latestPdf = outputPdf;
    latestFilename = deriveDownloadFilename(source);
    showPreview(outputPdf);
    downloadButton.disabled = false;
    downloadButton.removeAttribute("aria-disabled");
    downloadButton.title = "Download the compiled memo";
  } else {
    fieldStatus.hidden = true;
    showDiagnostics(outcome.diagnostics);
  }
}

// Single-flight compile with coalescing (design D3 of add-auto-compile):
// requests during a running compile set `dirty`, and one trailing rerun picks
// up the latest editor source.
let compiling = false;
let dirty = false;

async function requestCompile() {
  if (compiling) {
    dirty = true;
    return;
  }
  compiling = true;
  compileButton.disabled = true;
  compileButton.setAttribute("aria-busy", "true");
  const idleLabel = "Compile";
  compileButton.textContent = "Compiling…";
  try {
    do {
      dirty = false;
      await compileOnce();
    } while (dirty);
  } finally {
    compiling = false;
    compileButton.textContent = idleLabel;
    compileButton.removeAttribute("aria-busy");
    compileButton.disabled = false;
  }
}

const DEBOUNCE_MS = 500;
let debounceTimer: number | undefined;

editor.onChange(() => {
  clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    debounceTimer = undefined;
    void requestCompile();
  }, DEBOUNCE_MS);
});

compileButton.addEventListener("click", () => {
  clearTimeout(debounceTimer);
  debounceTimer = undefined;
  void requestCompile();
});

downloadButton.addEventListener("click", () => {
  if (!latestPdf) {
    return;
  }
  const url = URL.createObjectURL(new Blob([latestPdf.slice().buffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = latestFilename;
  link.click();
  URL.revokeObjectURL(url);
});

// Initial automatic compile of the starter example (design D5); also warms
// the lazy compiler-WASM load.
void requestCompile();

// Offline support (design D3/D6 of add-offline-support): production-only —
// dev serves no sw.js — and after load so registration never competes with
// the first compile's WASM fetch. updateViaCache keeps the host's HTTP cache
// from wedging sw.js updates.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      // Registration failure just means no offline capability this visit.
    });
  });
}

export { editor };
