/**
 * Narrow editor interface (design D2): all app code goes through this module,
 * so the underlying widget (currently a plain <textarea>) can be swapped for a
 * code editor later without touching callers or specs.
 */
export interface Editor {
  getSource(): string;
  setSource(source: string): void;
  onChange(callback: (source: string) => void): void;
}

export function createEditor(textarea: HTMLTextAreaElement): Editor {
  const callbacks: Array<(source: string) => void> = [];

  textarea.addEventListener("input", () => {
    for (const callback of callbacks) {
      callback(textarea.value);
    }
  });

  return {
    getSource: () => textarea.value,
    setSource: (source) => {
      textarea.value = source;
      for (const callback of callbacks) {
        callback(source);
      }
    },
    onChange: (callback) => {
      callbacks.push(callback);
    },
  };
}
