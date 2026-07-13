/**
 * Local draft persistence (design D1/D4 of add-draft-persistence): the memo
 * source under a versioned same-origin localStorage key. Every storage access
 * is guarded — unavailable or failing storage (private browsing, disabled,
 * quota) degrades to non-persistence, never to an error.
 */
const DRAFT_KEY = "memo.army.dev/draft@v1";

/** The saved draft, or undefined when absent, blank, or storage is unusable. */
export function loadDraft(): string | undefined {
  try {
    const draft = window.localStorage.getItem(DRAFT_KEY);
    return draft !== null && draft.trim().length > 0 ? draft : undefined;
  } catch {
    return undefined;
  }
}

export function saveDraft(source: string): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, source);
  } catch {
    // Storage unavailable or full — drafts simply don't persist.
  }
}
