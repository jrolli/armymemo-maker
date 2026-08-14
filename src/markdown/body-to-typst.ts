/**
 * Markdown body → Typst markup (design D2 of add-markdown-input). Parses with
 * commonmark.js (the CommonMark reference implementation) and walks the AST,
 * covering the constructs a memo needs: paragraphs, ordered/unordered lists
 * with nesting, emphasis, strong, inline code, links, and breaks. Ordered
 * items are emitted as explicit `N.` Typst enum markers so armymemo styles
 * them into AR 25-50 numbered paragraphs and interrupted lists keep their
 * numbering. Everything else fails closed with the construct named and
 * located — a memo silently missing content is worse than one that errors.
 * Function forms (#emph, #strong, #raw, #link) are used over markup
 * shorthands because they compose in any inline context (e.g. mid-word).
 */
import { Parser } from "commonmark";
import type { Node } from "commonmark";
import { MarkdownConversionError } from "./errors.ts";
import { escapeText, protectLineStart, typstString } from "./typst-source.ts";

const UNSUPPORTED: Record<string, string> = {
  heading: "heading",
  block_quote: "block quote",
  code_block: "code block",
  html_block: "raw HTML block",
  html_inline: "raw inline HTML",
  image: "image",
  thematic_break: "thematic break",
  custom_block: "custom block",
  custom_inline: "custom inline",
};

const children = (node: Node): Node[] => {
  const result: Node[] = [];
  for (let child = node.firstChild; child; child = child.next) result.push(child);
  return result;
};

/** `body` rendered as Typst markup; positions in errors are file lines. */
export function bodyToTypst(body: string, bodyStartLine: number): string {
  const document = new Parser().parse(body);
  return renderBlocks(children(document), bodyStartLine).join("\n");
}

function unsupported(node: Node, bodyStartLine: number): MarkdownConversionError {
  const label = UNSUPPORTED[node.type] ?? `\`${node.type}\``;
  // Inline nodes carry no source position; the nearest positioned ancestor
  // (at worst the containing block) locates the problem.
  let line: number | undefined;
  for (let ancestor: Node | null = node; ancestor; ancestor = ancestor.parent) {
    if (ancestor.sourcepos) {
      line = ancestor.sourcepos[0][0] + bodyStartLine - 1;
      break;
    }
  }
  return new MarkdownConversionError(
    `The memo body contains a Markdown ${label}${line === undefined ? "" : ` (line ${line})`}, ` +
      "which has no memo equivalent. Supported: paragraphs, numbered and bulleted " +
      "lists, emphasis, strong emphasis, inline code, links, and line breaks.",
  );
}

// Physical source lines for a run of block nodes, blank-line separated.
// Indentation for list nesting is applied by the caller prefixing each line.
function renderBlocks(nodes: Node[], bodyStartLine: number): string[] {
  const lines: string[] = [];
  for (const node of nodes) {
    if (lines.length > 0) lines.push("");
    switch (node.type) {
      case "paragraph": {
        for (const line of renderInlines(node, bodyStartLine).split("\n")) {
          lines.push(protectLineStart(line));
        }
        break;
      }
      case "list": {
        const ordered = node.listType === "ordered";
        const start = ordered ? (node.listStart ?? 1) : 0;
        children(node).forEach((item, index) => {
          const marker = ordered ? `${start + index}. ` : "- ";
          const continuation = " ".repeat(marker.length);
          const inner = renderBlocks(children(item), bodyStartLine);
          if (inner.length === 0) inner.push("");
          inner.forEach((line, lineIndex) => {
            if (lineIndex === 0) lines.push(marker + line);
            else lines.push(line === "" ? "" : continuation + line);
          });
        });
        break;
      }
      default:
        throw unsupported(node, bodyStartLine);
    }
  }
  return lines;
}

function renderInlines(parent: Node, bodyStartLine: number): string {
  let out = "";
  for (const node of children(parent)) {
    switch (node.type) {
      case "text":
        out += escapeText(node.literal ?? "");
        break;
      case "softbreak":
        out += " ";
        break;
      case "linebreak":
        out += "\\\n";
        break;
      case "emph":
        out += `#emph[${renderInlines(node, bodyStartLine)}]`;
        break;
      case "strong":
        out += `#strong[${renderInlines(node, bodyStartLine)}]`;
        break;
      case "code":
        out += `#raw(${typstString(node.literal ?? "")})`;
        break;
      case "link":
        out += `#link(${typstString(node.destination ?? "")})[${renderInlines(node, bodyStartLine)}]`;
        break;
      default:
        throw unsupported(node, bodyStartLine);
    }
  }
  return out;
}
