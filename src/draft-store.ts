/**
 * Local draft persistence (design D1/D4 of add-draft-persistence): the memo
 * source under versioned same-origin localStorage keys. Every storage access
 * is guarded — unavailable or failing storage (private browsing, disabled,
 * quota) degrades to non-persistence, never to an error.
 *
 * One draft per source-format mode (design D3 of add-editor-markdown-mode):
 * the original key keeps meaning "the Typst draft" so drafts saved before the
 * Markdown mode existed load unchanged, and the persisted mode falls back to
 * Typst on any absent or unrecognized value.
 */
export type SourceMode = "typst" | "markdown";

const DRAFT_KEYS: Record<SourceMode, string> = {
  typst: "memo.army.dev/draft@v1",
  markdown: "memo.army.dev/draft.markdown@v1",
};
const MODE_KEY = "memo.army.dev/mode@v1";

/** The saved draft, or undefined when absent, blank, or storage is unusable. */
export function loadDraft(mode: SourceMode): string | undefined {
  try {
    const draft = window.localStorage.getItem(DRAFT_KEYS[mode]);
    return draft !== null && draft.trim().length > 0 ? draft : undefined;
  } catch {
    return undefined;
  }
}

export function saveDraft(mode: SourceMode, source: string): void {
  try {
    window.localStorage.setItem(DRAFT_KEYS[mode], source);
  } catch {
    // Storage unavailable or full — drafts simply don't persist.
  }
}

/** The saved mode; anything absent, unknown, or unreadable means Typst. */
export function loadMode(): SourceMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === "markdown" ? "markdown" : "typst";
  } catch {
    return "typst";
  }
}

export function saveMode(mode: SourceMode): void {
  try {
    window.localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Storage unavailable or full — the mode simply doesn't persist.
  }
}
