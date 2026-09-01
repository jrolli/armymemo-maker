/**
 * Parsing of Vale's --output=JSON stdout into findings (design D4 of
 * add-vale-prose-linting). Pure module, shared by the lint worker and the
 * Node-side shim check.
 */

export type LintFormat = "md" | "typ";

/** One prose finding; line and span are 1-based positions in the linted source. */
export interface Finding {
  line: number;
  span: [number, number];
  severity: string;
  message: string;
  rule: string;
}

/** Vale's --output=JSON alert shape (the fields consumed here). */
interface ValeAlert {
  Check: string;
  Severity: string;
  Message: string;
  Line: number;
  Span: [number, number];
}

export function parseFindings(stdout: string, docPath: string): Finding[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(`vale emitted unparseable output: ${stdout.slice(0, 200)}`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`vale emitted unexpected output: ${stdout.slice(0, 200)}`);
  }
  // A runtime error ({"Code": "E100", "Text": ...}) instead of per-file alerts.
  if ("Code" in parsed && "Text" in parsed) {
    throw new Error(String((parsed as { Text: unknown }).Text));
  }
  const alerts = (parsed as Record<string, ValeAlert[]>)[docPath] ?? [];
  return alerts.map((alert) => ({
    line: alert.Line,
    span: alert.Span,
    severity: alert.Severity,
    message: alert.Message,
    rule: alert.Check,
  }));
}
