import {
  emptyTipDoc,
  heading,
  para,
  type DocumentSectionId,
  type SourceSnapshot,
  type TipDoc,
} from "./tiptap-types";
import { SECTION_LABELS } from "./templates";

function fmtField(label: string, value: string | number | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return `${label} : ${value}`;
}

function joinOrNonRenseigne(parts: (string | null)[], emptyLabel: string): string {
  const filled = parts.filter((p): p is string => Boolean(p));
  if (filled.length === 0) return `${emptyLabel} : non renseigné`;
  return filled.join(" · ");
}

/**
 * Snapshot → brouillon TipDoc.
 * Champs vides omis ou « non renseigné » — aucune négation automatique (« pas de… »).
 */
export function generateDraftFromSnapshot(
  snapshot: SourceSnapshot,
  sections: DocumentSectionId[],
): TipDoc {
  const doc = emptyTipDoc();
  doc.content.push(heading(1, "Compte rendu de consultation de cardiologie"));

  for (const section of sections) {
    const title = SECTION_LABELS[section];
    doc.content.push(heading(2, title));

    switch (section) {
      case "motif": {
        const motif = snapshot.motif?.trim() || null;
        const history = snapshot.history?.trim() || null;
        doc.content.push(
          para(
            joinOrNonRenseigne(
              [fmtField("Motif", motif), fmtField("Histoire", history)],
              "Motif / histoire",
            ),
          ),
        );
        break;
      }
      case "antecedents": {
        doc.content.push(para("Antécédents et traitements : non renseigné"));
        break;
      }
      case "examen": {
        const ex = snapshot.clinicalExam;
        const lines = [
          fmtField("TA", ex.tas != null && ex.tad != null ? `${ex.tas}/${ex.tad} mmHg` : null),
          fmtField("FC", ex.fc != null ? `${ex.fc} bpm` : null),
          fmtField("SpO₂", ex.spo2 != null ? `${ex.spo2} %` : null),
          fmtField("Poids", ex.weightKg != null ? `${ex.weightKg} kg` : null),
          fmtField("NYHA", ex.nyha != null ? String(ex.nyha) : null),
          fmtField("Auscultation", ex.auscultation != null ? String(ex.auscultation) : null),
        ];
        doc.content.push(para(joinOrNonRenseigne(lines, "Examen clinique")));
        break;
      }
      case "examens_comp": {
        const ecgParts = [
          fmtField("Rythme", snapshot.ecg.rythme != null ? String(snapshot.ecg.rythme) : null),
          fmtField("FC", snapshot.ecg.fc != null ? `${snapshot.ecg.fc} bpm` : null),
          fmtField("QTc", snapshot.ecg.qtc != null ? `${snapshot.ecg.qtc} ms` : null),
          fmtField(
            "Méthode QTc",
            snapshot.ecg.qtcMethod != null ? String(snapshot.ecg.qtcMethod) : null,
          ),
        ];
        doc.content.push(para(joinOrNonRenseigne(ecgParts, "ECG")));
        const echoParts = [
          fmtField("FEVG", snapshot.echo.fevg != null ? `${snapshot.echo.fevg} %` : null),
          fmtField(
            "Méthode",
            snapshot.echo.fevgMethod != null ? String(snapshot.echo.fevgMethod) : null,
          ),
          fmtField(
            "Conclusion ETT",
            snapshot.echo.conclusion != null ? String(snapshot.echo.conclusion) : null,
          ),
        ];
        doc.content.push(para(joinOrNonRenseigne(echoParts, "ETT")));
        const labParts = Object.entries(snapshot.labs).map(([k, v]) =>
          fmtField(k, v == null ? null : String(v)),
        );
        doc.content.push(para(joinOrNonRenseigne(labParts, "Biologie")));
        break;
      }
      case "scores": {
        if (snapshot.scores.length === 0) {
          doc.content.push(para("Scores : non renseigné"));
        } else {
          for (const s of snapshot.scores) {
            doc.content.push(para(`${s.label} : ${s.value} (référentiel ${s.ruleVersion})`));
          }
        }
        break;
      }
      case "courbes": {
        doc.content.push(para("Courbes de suivi : non renseigné"));
        break;
      }
      case "conclusion": {
        doc.content.push(
          para(
            snapshot.conclusion?.trim()
              ? `Conclusion : ${snapshot.conclusion.trim()}`
              : "Conclusion : non renseigné",
          ),
        );
        break;
      }
      case "conduite": {
        doc.content.push(
          para(
            snapshot.conduite?.trim()
              ? `Conduite à tenir : ${snapshot.conduite.trim()}`
              : "Conduite à tenir : non renseigné",
          ),
        );
        break;
      }
      default:
        break;
    }
  }

  return doc;
}

/** Texte plat pour copie / PDF / tests XSS — échappe tout HTML. */
export function tipDocToPlainText(doc: TipDoc): string {
  const lines: string[] = [];
  for (const node of doc.content) {
    const texts = (node.content ?? []).map((t) => t.text).join("");
    if (node.type === "heading") lines.push(texts.toUpperCase());
    else lines.push(texts);
  }
  return lines.filter(Boolean).join("\n");
}

/** Aucune négation automatique du type « pas de signe congestif ». */
export function assertNoAutoNegation(plain: string): boolean {
  return !/\bpas de\b/i.test(plain) && !/\baucun(e)?\s+(signe|anomalie)\b/i.test(plain);
}
