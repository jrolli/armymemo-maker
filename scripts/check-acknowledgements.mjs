#!/usr/bin/env node
/**
 * Acknowledgements drift check (design D6 of add-acknowledgements-page): fail
 * the build when the committed notice inventory (licenses/manifest.json) no
 * longer matches what the bundle actually ships, naming the stale component:
 *
 *   - typst.ts version   vs the @myriaddreamin/* pins in package.json
 *   - eform commit        vs vendor/eform/PROVENANCE
 *   - armymemo version    vs the vendor/armymemo-<version>.tar.gz tarball
 *   - font files          vs the .ttf files present in src/assets/fonts/
 *   - app version         vs package.json
 *
 * Also fails when the committed acknowledgements.html was not regenerated
 * after an inventory edit (its stamped inventory digest no longer matches).
 * Runs offline against committed files only — part of `npm run build`.
 * Remedy for any failure: refresh the inventory (see README "Maintenance"),
 * rerun `node scripts/generate-acknowledgements.mjs`, and commit the result.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { computeInventoryDigest } from "./lib/inventory-digest.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(ROOT, "licenses/manifest.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const component = (id) => manifest.components.find((c) => c.id === id);
const errors = [];

// typst.ts: both npm pins must match the recorded version.
{
  const recorded = component("typst.ts")?.version;
  for (const dep of ["@myriaddreamin/typst.ts", "@myriaddreamin/typst-ts-web-compiler"]) {
    const pinned = pkg.devDependencies[dep]?.replace(/^[~^]/, "");
    if (pinned !== recorded) {
      errors.push(`typst.ts: inventory records ${recorded} but package.json pins ${dep} ${pinned}`);
    }
  }
}

// eform: the pinned commit in PROVENANCE must match the recorded commit.
{
  const recorded = component("eform")?.commit;
  const provenance = readFileSync(join(ROOT, "vendor/eform/PROVENANCE"), "utf8");
  const shipped = provenance.match(/at commit ([0-9a-f]{40})/)?.[1];
  if (shipped !== recorded) {
    errors.push(`eform: inventory records commit ${recorded} but vendor/eform/PROVENANCE says ${shipped}`);
  }
}

// armymemo: the recorded version's tarball must be the one (and only) vendored.
{
  const recorded = component("armymemo")?.version;
  const tarballs = readdirSync(join(ROOT, "vendor")).filter((f) => /^armymemo-.*\.tar\.gz$/.test(f));
  if (!tarballs.includes(`armymemo-${recorded}.tar.gz`) || tarballs.length !== 1) {
    errors.push(
      `armymemo: inventory records ${recorded} but vendor/ contains ${tarballs.join(", ") || "no armymemo tarball"}`,
    );
  }
}

// fonts: the recorded font files must be exactly the .ttf files shipped.
{
  const recorded = [...(component("liberation-fonts")?.fonts ?? [])].sort();
  const shipped = readdirSync(join(ROOT, "src/assets/fonts")).filter((f) => f.endsWith(".ttf")).sort();
  if (JSON.stringify(recorded) !== JSON.stringify(shipped)) {
    errors.push(
      `liberation-fonts: inventory records [${recorded.join(", ")}] but src/assets/fonts/ ships [${shipped.join(", ")}]`,
    );
  }
  if (!existsSync(join(ROOT, "src/assets/fonts/LICENSE"))) {
    errors.push("liberation-fonts: src/assets/fonts/LICENSE is missing (OFL-1.1 requires it)");
  }
}

// app: recorded version must match package.json.
{
  const recorded = component("app")?.version;
  if (pkg.version !== recorded) {
    errors.push(`app: inventory records ${recorded} but package.json says ${pkg.version}`);
  }
}

// The committed page must have been regenerated after the last inventory edit.
{
  const page = readFileSync(join(ROOT, "acknowledgements.html"), "utf8");
  const stamped = page.match(/name="inventory-digest" content="([^"]+)"/)?.[1];
  const current = computeInventoryDigest(ROOT);
  if (stamped !== current) {
    errors.push(
      "acknowledgements.html: stale — its stamped inventory digest does not match licenses/; " +
        "rerun `node scripts/generate-acknowledgements.mjs` and commit the result",
    );
  }
}

if (errors.length > 0) {
  console.error("check-acknowledgements: notice inventory is out of sync with the shipped bundle:");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

console.log(
  `check-acknowledgements: OK (${manifest.components.length} components match the shipped versions)`,
);
