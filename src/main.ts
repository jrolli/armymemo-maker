import "./style.css";
import { createEditor } from "./editor";
import exampleSource from "./assets/example.typ?raw";

const textarea = document.getElementById("source-editor");
if (!(textarea instanceof HTMLTextAreaElement)) {
  throw new Error("source editor textarea not found");
}

const editor = createEditor(textarea);
editor.setSource(exampleSource);

export { editor };
