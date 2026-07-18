import "./style.css";
import { createEditor } from "./editor";
import { compileToPdf } from "./typst-service";
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
const diagnosticsPane = element("diagnostics", HTMLPreElement);
const preview = element("pdf-preview", HTMLIFrameElement);

const editor = createEditor(textarea);
editor.setSource(exampleSource);

let latestPdf: Uint8Array | undefined;
let previewUrl: string | undefined;

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
      downloadButton.disabled = false;
      downloadButton.removeAttribute("aria-disabled");
      downloadButton.title = "Download the compiled memo";
    } else {
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
