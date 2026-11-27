import { tipDocToPlainText } from "./generate";
import type { TipDoc } from "./tiptap-types";

export type DiffLine = { kind: "same" | "added" | "removed"; text: string };

/** Diff ligne à ligne (aperçu médecin) entre deux TipDoc. */
export function diffTipDocs(before: TipDoc, after: TipDoc): DiffLine[] {
  const a = tipDocToPlainText(before).split("\n");
  const b = tipDocToPlainText(after).split("\n");
  const max = Math.max(a.length, b.length);
  const out: DiffLine[] = [];
  for (let i = 0; i < max; i++) {
    const left = a[i];
    const right = b[i];
    if (left === right) {
      if (left != null) out.push({ kind: "same", text: left });
    } else {
      if (left != null) out.push({ kind: "removed", text: left });
      if (right != null) out.push({ kind: "added", text: right });
    }
  }
  return out;
}
