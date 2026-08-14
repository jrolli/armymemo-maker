import "./style.css";
import { createEditor } from "./editor";
import { compileToPdf, addFields } from "./compile-client";
import { deriveDownloadFilename } from "./download-filename";
import type { FormField } from "./typst-service";
import { loadDraft, saveDraft, loadMode, saveMode, type SourceMode } from "./draft-store";
import { convertMarkdownMemo, MarkdownConversionError } from "./markdown";
import exampleTypst from "./assets/example.typ?raw";
import exampleMarkdown from "./assets/example.md?raw";

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) {
    throw new Error(`element #${id} missing or wrong type`);
  }
  return found;
}

const textarea = element("source-editor", HTMLTextAreaElement);
const sourceHeading = element("source-heading", HTMLHeadingElement);
const compileButton = element("compile-button", HTMLButtonElement);
const downloadButton = element("download-button", HTMLButtonElement);
const emptyState = element("output-empty", HTMLDivElement);
const fieldStatus = element("field-status", HTMLParagraphElement);
const diagnosticsPane = element("diagnostics", HTMLPreElement);
const preview = element("pdf-preview", HTMLIFrameElement);

const editor = createEditor(textarea);

// Source-format mode (design D1/D3 of add-editor-markdown-mode): one draft
// and one starter example per mode; `mode` is read by the save subscription
// and the compile snapshot, so it must be current before either runs.
const EXAMPLES: Record<SourceMode, string> = { typst: exampleTypst, markdown: exampleMarkdown };
const modeRadios = [...document.querySelectorAll<HTMLInputElement>('input[name="source-mode"]')];
let mode = loadMode();

function applyModeLabels() {
  sourceHeading.textContent = mode === "markdown" ? "Markdown source" : "Typst source";
  textarea.setAttribute(
    "aria-label",
    mode === "markdown" ? "Markdown memo source" : "Typst memo source",
  );
}

for (const radio of modeRadios) {
  radio.checked = radio.value === mode;
}
applyModeLabels();

// Restore before wiring the save subscription so restoring never re-saves
// (design D3 of add-draft-persistence); blank drafts fall back to the example.
editor.setSource(loadDraft(mode) ?? EXAMPLES[mode]);
editor.onChange((source) => saveDraft(mode, source));

for (const radio of modeRadios) {
  radio.addEventListener("change", () => {
    if (!radio.checked || radio.value === mode) {
      return;
    }
    // Switch the save target before loading the incoming draft (design D3):
    // the outgoing mode's draft was already saved on its last edit, and the
    // setSource below fires the change subscriptions, so the save lands under
    // the new mode's key and the debounced recompile picks the source up.
    mode = radio.value === "markdown" ? "markdown" : "typst";
    saveMode(mode);
    applyModeLabels();
    editor.setSource(loadDraft(mode) ?? EXAMPLES[mode]);
  });
}

let latestPdf: Uint8Array | undefined;
let latestFilename = "memo.pdf";
let latestFields: FormField[] | undefined;
let previewUrl: string | undefined;

function showFieldStatus(text: string, options: { warn?: boolean; manifest?: FormField[] } = {}) {
  fieldStatus.classList.toggle("field-status--warn", options.warn === true);
  if (options.manifest) {
    fieldStatus.dataset.manifest = JSON.stringify(options.manifest);
  } else {
    delete fieldStatus.dataset.manifest;
  }
  fieldStatus.textContent = text;
  fieldStatus.hidden = false;
}

// Status wording (design D4 of update-armymemo-eform): signature-centric
// while that's all armymemo emits, generic once other field types appear.
function fieldNoun(fields: { type?: string }[]): string {
  const allSignature = fields.every((field) => field.type === undefined || field.type === "signature");
  return allSignature ? "signature field" : "form field";
}

/**
 * Produce the output PDF and its status line: signable via eform when a valid
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
  const summary = `${extraction.fields.length} ${fieldNoun(extraction.fields)}${plural}: ${names}`;
  try {
    const signable = await addFields(outcome.pdf, extraction.fields);
    showFieldStatus(`${summary} — signable PDF ready`, { manifest: extraction.fields });
    return signable;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showFieldStatus(`${summary} — eform failed: ${message} — download is the plain PDF`, {
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
  // add-subject-download-filename). In Markdown mode the snapshot is
  // converted first, and the converted Typst feeds both the compiler and the
  // filename derivation (design D2 of add-editor-markdown-mode); a
  // conversion error surfaces like compile diagnostics, leaving the previous
  // output and its Download untouched.
  let source = editor.getSource();
  if (mode === "markdown") {
    try {
      source = convertMarkdownMemo(source);
    } catch (error) {
      if (!(error instanceof MarkdownConversionError)) {
        throw error;
      }
      fieldStatus.hidden = true;
      showDiagnostics(error.message);
      return;
    }
  }
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
//
// Update surfacing (add-sw-update-button): a byte-different sw.js installs its
// new precache and then waits; the button reveals that waiting worker and the
// click is the only path that promotes it (SKIP_WAITING) and reloads (on
// controllerchange, listener attached only here so no other path can reload).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const updateButton = element("update-button", HTMLButtonElement);

  const showUpdateButton = (worker: ServiceWorker) => {
    updateButton.hidden = false;
    updateButton.onclick = () => {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => window.location.reload(),
        { once: true },
      );
      worker.postMessage("SKIP_WAITING");
    };
  };

  window.addEventListener("load", async () => {
    let reg: ServiceWorkerRegistration;
    try {
      reg = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
    } catch {
      // Registration failure just means no offline capability this visit.
      return;
    }

    // The controller check keeps a first visit's initial install from being
    // mistaken for an update — only a page already controlled by an old
    // worker can have a *new* version waiting.
    if (reg.waiting && navigator.serviceWorker.controller) {
      showUpdateButton(reg.waiting);
    }
    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateButton(worker);
        }
      });
    });

    // Long-lived tabs and installed windows rarely navigate, so they would
    // never hit the browser's on-navigation sw.js check; re-check when the
    // window regains visibility, at most hourly (design D4).
    let lastUpdateCheck = Date.now();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && Date.now() - lastUpdateCheck > 60 * 60 * 1000) {
        lastUpdateCheck = Date.now();
        void reg.update().catch(() => {
          // Offline or transient failure — the next check will try again.
        });
      }
    });
  });
}

export { editor };
