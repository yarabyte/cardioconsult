import { describe, expect, it } from "vitest";
import { EXAM_ORDER_PROTOCOLS } from "./catalog-v15";
import {
  addCoreItems,
  addCustomExam,
  assertCatalogInvariants,
  buildExamOrderPreview,
  filterProtocols,
  getProtocol,
  listExamOrderFilters,
  toggleOptionalItem,
} from "./ops";
import { emptyExamOrdersDraft } from "./types";

describe("catalogue examens V15", () => {
  it("expose 24 bilans et 6 filtres", () => {
    const inv = assertCatalogInvariants();
    expect(inv.protocolCount).toBe(24);
    expect(inv.filterCount).toBe(6);
    expect(listExamOrderFilters()).toEqual([
      "Toutes",
      "Cardiologie",
      "Infectiologie",
      "Endocrinologie",
      "HTA secondaire",
      "Autres",
    ]);
  });

  it("filtre par spécialité", () => {
    expect(filterProtocols("Infectiologie").every((p) => p.group === "Infectiologie")).toBe(true);
    expect(filterProtocols("Infectiologie").length).toBe(6);
    expect(filterProtocols("HTA secondaire")).toHaveLength(1);
    expect(filterProtocols("Toutes")).toHaveLength(24);
  });

  it("ne préremplit pas mycologie / virologie / tests dynamiques", () => {
    for (const id of [
      "infect_viral",
      "infect_fungal",
      "infect_urine",
      "infect_bacterien",
      "endo_synacthene",
      "endo_dexa",
    ]) {
      const p = getProtocol(id);
      expect(p, id).toBeDefined();
      expect(p!.core.length, id).toBe(0);
      expect(p!.flags.emptyCoreByDesign).toBe(true);
    }
  });

  it("déduplique le bilan de base entre protocoles", () => {
    const endo = getProtocol("infect_endocardite")!;
    const orient = getProtocol("infectio")!;
    let selected = addCoreItems([], endo);
    const before = selected.length;
    selected = addCoreItems(selected, endo);
    expect(selected.length).toBe(before);
    selected = addCoreItems(selected, orient);
    const ids = selected.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("hc3");
  });

  it("avertit sur l’endocardite et refuse l’arrêt auto d’anti-HTA", () => {
    const ei = getProtocol("infect_endocardite")!;
    expect(ei.flags.endocarditisPrecaution).toBe(true);
    expect(ei.core.some((c) => /trois séries/i.test(c.label))).toBe(true);

    const hta = getProtocol("hta_secondaire")!;
    expect(hta.flags.noAutoDrugStop).toBe(true);
    const draft = {
      ...emptyExamOrdersDraft(),
      activeProtocolId: "hta_secondaire",
      selected: addCoreItems([], hta),
    };
    const preview = buildExamOrderPreview(draft);
    expect(preview).toMatch(/ne jamais arrêter automatiquement/i);
    expect(preview).not.toMatch(/arrêt automatique des antihypertenseurs activé/i);
  });

  it("ajoute un examen libre sans injection HTML", () => {
    const selected = addCustomExam([], "<script>x</script> cortisol");
    expect(selected).toHaveLength(1);
    expect(selected[0]?.label).toBe("<script>x</script> cortisol");
    expect(selected[0]?.custom).toBe(true);
  });

  it("bascule les optionnels", () => {
    const viral = getProtocol("infect_viral")!;
    const first = viral.optional[0]!;
    let selected = toggleOptionalItem([], viral, first.id);
    expect(selected).toHaveLength(1);
    selected = toggleOptionalItem(selected, viral, first.id);
    expect(selected).toHaveLength(0);
  });

  it("garantit des ids uniques dans le catalogue", () => {
    const ids = EXAM_ORDER_PROTOCOLS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
