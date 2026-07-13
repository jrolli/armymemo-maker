import "./style.css";
import { createEditor } from "./editor";
import { compileToPdf, type FieldExtraction, type SignatureField } from "./typst-service";
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
editor.setSource(exampleSource);

let latestPdf: Uint8Array | undefined;
let latestFields: SignatureField[] | undefined;
let previewUrl: string | undefined;

function showFieldStatus(extraction: FieldExtraction) {
  fieldStatus.classList.remove("field-status--warn");
  delete fieldStatus.dataset.manifest;
  if ("error" in extraction) {
    latestFields = undefined;
    fieldStatus.textContent = `Signature field problem: ${extraction.error}`;
    fieldStatus.classList.add("field-status--warn");
  } else if (extraction.fields.length === 0) {
    latestFields = undefined;
    fieldStatus.textContent = "No signature fields — download will be a plain (non-signable) PDF";
  } else {
    latestFields = extraction.fields;
    const names = extraction.fields.map((field) => field.name).join(", ");
    const plural = extraction.fields.length === 1 ? "" : "s";
    fieldStatus.textContent = `${extraction.fields.length} signature field${plural}: ${names}`;
    fieldStatus.dataset.manifest = JSON.stringify(extraction.fields);
  }
  fieldStatus.hidden = false;
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

compileButton.addEventListener("click", async () => {
  compileButton.disabled = true;
  compileButton.setAttribute("aria-busy", "true");
  const idleLabel = "Compile";
  compileButton.textContent = "Compiling…";
  try {
    const outcome = await compileToPdf(editor.getSource());
    if (outcome.ok) {
      latestPdf = outcome.pdf;
      showPreview(outcome.pdf);
      showFieldStatus(outcome.fields);
      downloadButton.disabled = false;
      downloadButton.removeAttribute("aria-disabled");
      downloadButton.title = "Download the compiled memo";
    } else {
      fieldStatus.hidden = true;
      showDiagnostics(outcome.diagnostics);
    }
  } finally {
    compileButton.textContent = idleLabel;
    compileButton.removeAttribute("aria-busy");
    compileButton.disabled = false;
  }
});

downloadButton.addEventListener("click", () => {
  if (!latestPdf) {
    return;
  }
  const url = URL.createObjectURL(new Blob([latestPdf.slice().buffer], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "memo.pdf";
  link.click();
  URL.revokeObjectURL(url);
});

export { editor };
