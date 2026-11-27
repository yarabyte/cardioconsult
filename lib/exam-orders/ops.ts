import {
  EXAM_ORDER_GROUPS,
  EXAM_ORDER_PROTOCOLS,
  type ExamOrderGroup,
  type ExamOrderItem,
  type ExamOrderProtocol,
} from "./catalog-v15";
import type { ExamOrderGroupFilter, ExamOrderSelectedItem, ExamOrdersDraft } from "./types";

export function listExamOrderFilters(): ExamOrderGroupFilter[] {
  return ["Toutes", ...EXAM_ORDER_GROUPS];
}

export function filterProtocols(group: ExamOrderGroupFilter): ExamOrderProtocol[] {
  if (group === "Toutes") return [...EXAM_ORDER_PROTOCOLS];
  return EXAM_ORDER_PROTOCOLS.filter((p) => p.group === group);
}

export function getProtocol(id: string): ExamOrderProtocol | undefined {
  return EXAM_ORDER_PROTOCOLS.find((p) => p.id === id);
}

function toSelected(item: ExamOrderItem, protocolId: string): ExamOrderSelectedItem {
  return {
    id: item.id,
    label: item.label,
    sourceProtocolId: protocolId,
  };
}

/** Ajoute le bilan de base sans dupliquer les ids déjà présents. */
export function addCoreItems(
  selected: ExamOrderSelectedItem[],
  protocol: ExamOrderProtocol,
): ExamOrderSelectedItem[] {
  const ids = new Set(selected.map((s) => s.id));
  const next = [...selected];
  for (const item of protocol.core) {
    if (ids.has(item.id)) continue;
    ids.add(item.id);
    next.push(toSelected(item, protocol.id));
  }
  return next;
}

export function toggleOptionalItem(
  selected: ExamOrderSelectedItem[],
  protocol: ExamOrderProtocol,
  itemId: string,
): ExamOrderSelectedItem[] {
  const item =
    protocol.optional.find((o) => o.id === itemId) ?? protocol.core.find((o) => o.id === itemId);
  if (!item) return selected;
  if (selected.some((s) => s.id === itemId)) {
    return selected.filter((s) => s.id !== itemId);
  }
  return [...selected, toSelected(item, protocol.id)];
}

export function removeSelectedItem(
  selected: ExamOrderSelectedItem[],
  itemId: string,
): ExamOrderSelectedItem[] {
  return selected.filter((s) => s.id !== itemId);
}

export function addCustomExam(
  selected: ExamOrderSelectedItem[],
  label: string,
): ExamOrderSelectedItem[] {
  const trimmed = label.trim().slice(0, 150);
  if (!trimmed) return selected;
  const id = `custom:${trimmed.toLowerCase()}`;
  if (selected.some((s) => s.id === id || s.label.toLowerCase() === trimmed.toLowerCase())) {
    return selected;
  }
  return [...selected, { id, label: trimmed, sourceProtocolId: null, custom: true }];
}

export function isItemSelected(selected: ExamOrderSelectedItem[], itemId: string): boolean {
  return selected.some((s) => s.id === itemId);
}

/** Aperçu texte brut (safe) — brouillon non signé. */
export function buildExamOrderPreview(draft: ExamOrdersDraft): string {
  const lines: string[] = [
    "BROUILLON — examens complémentaires (non exécutoire)",
    "Aucune transmission laboratoire · validation médicale requise",
    "",
    `Priorité : ${draft.priority}`,
  ];
  if (draft.desiredDate?.trim()) {
    lines.push(`Date souhaitée : ${draft.desiredDate.trim()}`);
  }
  if (draft.indication?.trim()) {
    lines.push(`Indication : ${draft.indication.trim()}`);
  }
  if (draft.samplingNotes?.trim()) {
    lines.push(`Consignes : ${draft.samplingNotes.trim()}`);
  }
  lines.push("", "Examens :");
  if (draft.selected.length === 0) {
    lines.push("— (aucun)");
  } else {
    for (const item of draft.selected) {
      const tag = item.custom ? " (libre)" : "";
      lines.push(`- ${item.label}${tag}`);
    }
  }
  const protocol = draft.activeProtocolId ? getProtocol(draft.activeProtocolId) : undefined;
  if (protocol?.flags.endocarditisPrecaution) {
    lines.push(
      "",
      "Précaution : trois séries d’hémocultures avant antibiothérapie si réalisable ; ne pas retarder l’antibiothérapie si le patient est instable.",
    );
  }
  if (protocol?.flags.dynamicTest) {
    lines.push(
      "",
      "Test dynamique spécialisé : planification avec le service / laboratoire ; pas d’administration médicamenteuse automatisée.",
    );
  }
  if (protocol?.flags.noAutoDrugStop) {
    lines.push(
      "",
      "HTA secondaire : ne jamais arrêter automatiquement les antihypertenseurs ; consigner traitements et conditions de prélèvement.",
    );
  }
  return lines.join("\n");
}

export function assertCatalogInvariants(): {
  protocolCount: number;
  filterCount: number;
  emptyCoreIds: string[];
} {
  const emptyCoreIds = EXAM_ORDER_PROTOCOLS.filter(
    (p) => p.core.length === 0 || p.flags.emptyCoreByDesign,
  ).map((p) => p.id);
  return {
    protocolCount: EXAM_ORDER_PROTOCOLS.length,
    filterCount: listExamOrderFilters().length,
    emptyCoreIds,
  };
}

export type { ExamOrderGroup };
