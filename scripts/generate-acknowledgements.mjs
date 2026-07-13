#!/usr/bin/env node
/**
 * Assemble acknowledgements.html from the committed notice inventory in
 * licenses/ (design D1-D3 of add-acknowledgements-page). The page is plain
 * static HTML (site stylesheet, no scripts): top-level components, the Rust
 * crates compiled into each WASM binary grouped by license, and every unique
 * license text exactly once.
 *
 * Maintenance-time tooling — like vendor-armymemo.mjs / vendor-esign.sh it
 * MAY use the network; `npm run build` never runs it and only bundles the
 * committed page. Modes:
 *
 *   node scripts/generate-acknowledgements.mjs
 *     Offline: assemble the page from committed files only. Errors if a
 *     required license text is missing from licenses/texts/.
 *
 *   node scripts/generate-acknowledgements.mjs --fetch-texts
 *     Also fetch any missing license texts from the spdx/license-list-data
 *     tag pinned in licenses/manifest.json into licenses/texts/.
 *
 *   node scripts/generate-acknowledgements.mjs --refresh
 *     Additionally re-derive the typst-ts-web-compiler crate inventory:
 *     clones Myriad-Dreamin/typst.ts at the tag matching the version pinned
 *     in package.json and runs scripts/emit-crate-inventory.mjs against its
 *     Cargo.lock with the same feature set upstream uses to build the
 *     published web package (--no-default-features --features web,misc — see
 *     packages/compiler/package.json "build" in the upstream repo). Requires
 *     git and cargo. The matching esign inventory is emitted by
 *     scripts/vendor-esign.sh from the same checkout that builds the WASM.
 *
 * After changing any input, rerun this script and commit the regenerated
 * acknowledgements.html — scripts/check-acknowledgements.mjs fails the build
 * if the committed page is stale or the inventory drifts from the shipped
 * versions.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { computeInventoryDigest } from "./lib/inventory-digest.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const LICENSES = join(ROOT, "licenses");
const TEXTS = join(LICENSES, "texts");
const OUT = join(ROOT, "acknowledgements.html");

const refresh = process.argv.includes("--refresh");
const fetchTexts = refresh || process.argv.includes("--fetch-texts");

const manifest = JSON.parse(readFileSync(join(LICENSES, "manifest.json"), "utf8"));

// --- Optional: re-derive the typst-ts-web-compiler crate inventory ----------

if (refresh) {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
  const version = pkg.devDependencies["@myriaddreamin/typst-ts-web-compiler"].replace(/^[~^]/, "");
  const stage = mkdtempSync(join(tmpdir(), "typst-ts-inventory-"));
  try {
    console.log(`cloning Myriad-Dreamin/typst.ts at v${version}...`);
    execFileSync(
      "git",
      ["clone", "--quiet", "--depth", "1", "--branch", `v${version}`,
        "https://github.com/Myriad-Dreamin/typst.ts", join(stage, "typst.ts")],
      { stdio: "inherit" },
    );
    execFileSync(
      process.execPath,
      [join(ROOT, "scripts/emit-crate-inventory.mjs"),
        "--manifest-path", join(stage, "typst.ts", "Cargo.toml"),
        "--package", "typst-ts-web-compiler",
        "--no-default-features", "--features", "web,misc",
        "--out", join(LICENSES, "typst-ts-web-compiler-crates.json")],
      { stdio: "inherit" },
    );
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

// --- License expressions -----------------------------------------------------

// Normalize an SPDX expression: legacy "A/B" means "A OR B"; pure-OR
// expressions are order-insensitive, so sort their operands for grouping.
function normalizeExpression(raw) {
  const expr = raw.replaceAll("/", " OR ").replace(/\s+/g, " ").trim();
  if (!/\bAND\b|\bWITH\b|[()]/.test(expr)) {
    return [...new Set(expr.split(" OR "))].sort().join(" OR ");
  }
  return expr;
}

// Every SPDX license/exception id appearing in an expression.
function idsIn(expression) {
  return [...new Set(
    expression.split(/[\s()/]+/).filter((t) => t && t !== "OR" && t !== "AND" && t !== "WITH"),
  )];
}

// --- Load components and crate inventories -----------------------------------

const crateSections = [];
const requiredIds = new Set();
for (const component of manifest.components) {
  for (const id of idsIn(normalizeExpression(component.license))) requiredIds.add(id);
  if (!component.crates) continue;
  const crates = JSON.parse(readFileSync(join(LICENSES, component.crates.file), "utf8"));
  const groups = new Map(); // normalized expression -> crates
  for (const crate of crates) {
    const expr = normalizeExpression(crate.license);
    for (const id of idsIn(expr)) requiredIds.add(id);
    if (!groups.has(expr)) groups.set(expr, []);
    groups.get(expr).push(crate);
  }
  crateSections.push({ component, groups, total: crates.length });
}

// --- License texts (vendored files first, SPDX canonical for the rest) -------

const VENDORED_TEXTS = {
  "AGPL-3.0-or-later": join(ROOT, "LICENSE"),
  "OFL-1.1": join(ROOT, "src/assets/fonts/LICENSE"),
};

mkdirSync(TEXTS, { recursive: true });
const missing = [...requiredIds].filter(
  (id) => !(id in VENDORED_TEXTS) && !existsSync(join(TEXTS, `${id}.txt`)),
);
if (missing.length > 0) {
  if (!fetchTexts) {
    console.error(
      `generate-acknowledgements: missing license texts for ${missing.join(", ")} — ` +
        "rerun with --fetch-texts (network) to vendor them into licenses/texts/.",
    );
    process.exit(1);
  }
  for (const id of missing) {
    const url = `https://raw.githubusercontent.com/spdx/license-list-data/${manifest.spdxDataTag}/text/${id}.txt`;
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`generate-acknowledgements: ${response.status} fetching ${url}`);
      process.exit(1);
    }
    writeFileSync(join(TEXTS, `${id}.txt`), await response.text());
    console.log(`fetched license text ${id}`);
  }
}

function licenseText(id) {
  return readFileSync(VENDORED_TEXTS[id] ?? join(TEXTS, `${id}.txt`), "utf8");
}

// Deduplicate identical texts (design D3): one block per unique text, every
// id sharing it anchored to that block.
const textBlocks = new Map(); // text -> ids
for (const id of [...requiredIds].sort()) {
  const text = licenseText(id);
  if (!textBlocks.has(text)) textBlocks.set(text, []);
  textBlocks.get(text).push(id);
}

// --- Render ------------------------------------------------------------------

const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const anchor = (id) => `license-${id.replaceAll(".", "-")}`;
const linkedExpression = (raw) =>
  normalizeExpression(raw)
    .split(/(\s+|[()])/)
    .map((token) =>
      requiredIds.has(token) ? `<a href="#${anchor(token)}">${esc(token)}</a>` : esc(token),
    )
    .join("");
const authorNames = (authors) =>
  authors.map((a) => a.replace(/\s*<[^>]*>/g, "").trim()).filter(Boolean).join(", ");

function componentHtml(c) {
  const version = c.commit
    ? `${c.version} (commit <code>${esc(c.commit)}</code>)`
    : esc(c.version);
  return `      <section class="ack-component">
        <h3>${esc(c.name)} <span class="ack-version">${version}</span></h3>
${c.copyright.map((line) => `        <p class="ack-copyright">${esc(line)}</p>`).join("\n")}
        <p>${esc(c.description)}
          Source: <a href="${esc(c.source)}">${esc(c.source.replace(/^https?:\/\//, ""))}</a>.
          License: ${linkedExpression(c.license)}.</p>
      </section>`;
}

function crateSectionHtml({ component, groups, total }) {
  const sorted = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  );
  const groupHtml = sorted.map(([expr, crates]) => {
    const items = crates.map((crate) => {
      const authors = authorNames(crate.authors);
      const repo = crate.repository
        ? ` — <a href="${esc(crate.repository)}">${esc(crate.repository.replace(/^https?:\/\//, ""))}</a>`
        : "";
      return `          <li><code>${esc(crate.name)}</code> ${esc(crate.version)}${
        authors ? ` — ${esc(authors)}` : ""
      }${repo}</li>`;
    });
    return `        <h4>${linkedExpression(expr)} <span class="ack-version">(${crates.length} crate${
      crates.length === 1 ? "" : "s"
    })</span></h4>
        <ul class="ack-crates">
${items.join("\n")}
        </ul>`;
  });
  return `      <section>
        <h3>${esc(component.crates.heading)} <span class="ack-version">(${total} crates)</span></h3>
        <p>${esc(component.crates.note)} Where a crate declares alternative licenses
          (&#8220;OR&#8221;), this distribution may be used under any of them; every referenced
          license text appears in full below.</p>
${groupHtml.join("\n")}
      </section>`;
}

const textHtml = [...textBlocks.entries()].map(([text, ids]) => {
  const [first, ...rest] = ids;
  const extraAnchors = rest.map((id) => `<span id="${anchor(id)}"></span>`).join("");
  return `      <section>
        <h3 id="${anchor(first)}">${extraAnchors}${ids.map(esc).join(" / ")}</h3>
        <pre class="ack-license-text">${esc(text)}</pre>
      </section>`;
});

const html = `<!doctype html>
<!-- Generated by scripts/generate-acknowledgements.mjs — do not edit by hand.
     Regenerate after changing anything in licenses/, LICENSE, or
     src/assets/fonts/LICENSE; check-acknowledgements.mjs enforces this. -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Copyright notices and license texts for every third-party component shipped with memo.army.dev."
    />
    <meta name="inventory-digest" content="${computeInventoryDigest(ROOT)}" />
    <title>Acknowledgements — memo.army.dev</title>
    <link rel="stylesheet" href="/src/style.css" />
    <link rel="icon" href="/icon.svg" type="image/svg+xml" />
    <meta name="theme-color" content="#1a1d21" />
  </head>
  <body class="ack-body">
    <header class="app-header">
      <h1>memo.army.dev</h1>
      <p class="tagline">Acknowledgements</p>
    </header>

    <main class="ack-main">
      <p>
        memo.army.dev is free software, and it ships alongside free software: the delivered
        bundle redistributes the components below, including every Rust crate compiled into
        its two WebAssembly binaries. Each entry lists the version actually shipped, its
        copyright holders or authors, and its license; the full text of every referenced
        license appears once in the <a href="#license-texts">license texts</a> section.
        URLs on this page are plain references — the app itself never talks to any server
        beyond the one hosting it.
      </p>

      <h2>Components</h2>
${manifest.components.map(componentHtml).join("\n")}

${crateSections.map(crateSectionHtml).join("\n")}

      <h2 id="license-texts">License texts</h2>
${textHtml.join("\n")}
    </main>

    <footer class="action-bar">
      <p class="local-note"><a href="/">Back to memo.army.dev</a></p>
    </footer>
  </body>
</html>
`;

writeFileSync(OUT, html);
const crateCount = crateSections.reduce((n, s) => n + s.total, 0);
console.log(
  `generate-acknowledgements: wrote acknowledgements.html ` +
    `(${manifest.components.length} components, ${crateCount} crates, ${textBlocks.size} unique license texts)`,
);
