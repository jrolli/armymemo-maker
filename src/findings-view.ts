/**
 * Shared prose-findings presenter for the editor and conversion pages
 * (design D4 of add-vale-prose-linting). Owns the advisory findings region:
 * dispatches a lint for each snapshot, drops stale responses so findings
 * from different snapshots never mix, replaces the list atomically, hides
 * the region when a lint comes back clean, and degrades any lint failure to
 * a single quiet "unavailable" note. Nothing here touches compile state.
 */
import { lintProse, type Finding, type LintFormat } from "./lint-client";

export interface LintPresenter {
  /** Lint one source snapshot and render its findings when they arrive. */
  request(source: string, format: LintFormat): void;
}

function findingItem(finding: Finding): HTMLLIElement {
  const item = document.createElement("li");
  const loc = document.createElement("span");
  loc.className = "prose-loc";
  loc.textContent = `${finding.line}:${finding.span[0]}`;
  const severity = document.createElement("span");
  severity.className = `prose-severity prose-severity--${finding.severity}`;
  severity.textContent = finding.severity;
  const rule = document.createElement("span");
  rule.className = "prose-rule";
  rule.textContent = `[${finding.rule}]`;
  item.append(loc, " ", severity, ` ${finding.message} `, rule);
  return item;
}

export function createLintPresenter(
  region: HTMLElement,
  title: HTMLElement,
  list: HTMLUListElement,
  options: {
    /**
     * Hide the region while a lint is in flight — for the conversion page's
     * one-shot flow, where a previous file's findings would otherwise linger
     * under the new file's status. The editor keeps its list steady between
     * debounced recompiles instead.
     */
    hideWhilePending?: boolean;
  } = {},
): LintPresenter {
  let sequence = 0;

  function show(findings: Finding[]) {
    if (findings.length === 0) {
      region.hidden = true;
      list.replaceChildren();
      return;
    }
    title.textContent = `Prose suggestions (${findings.length})`;
    list.replaceChildren(...findings.map(findingItem));
    region.hidden = false;
  }

  function showUnavailable() {
    title.textContent = "Prose suggestions";
    const note = document.createElement("li");
    note.className = "prose-unavailable";
    note.textContent = "Prose check unavailable — the memo itself is unaffected.";
    list.replaceChildren(note);
    region.hidden = false;
  }

  return {
    request(source, format) {
      const snapshot = ++sequence;
      if (options.hideWhilePending === true) {
        region.hidden = true;
        list.replaceChildren();
      }
      lintProse(source, format).then(
        (findings) => {
          if (snapshot === sequence) show(findings);
        },
        () => {
          if (snapshot === sequence) showUnavailable();
        },
      );
    },
  };
}
