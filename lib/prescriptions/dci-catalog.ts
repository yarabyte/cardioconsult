/** Catalogue DCI local de démonstration — pas une base certifiée. */

export type DciEntry = {
  dci: string;
  commonForms: string[];
};

export const DEMO_DCI_CATALOG: DciEntry[] = [
  { dci: "bisoprolol", commonForms: ["comprimé"] },
  { dci: "ramipril", commonForms: ["gélule", "comprimé"] },
  { dci: "spironolactone", commonForms: ["comprimé"] },
  { dci: "furosémide", commonForms: ["comprimé", "ampoule"] },
  { dci: "atorvastatine", commonForms: ["comprimé"] },
  { dci: "aspirine", commonForms: ["comprimé"] },
  { dci: "clopidogrel", commonForms: ["comprimé"] },
  { dci: "apixaban", commonForms: ["comprimé"] },
  { dci: "rivaroxaban", commonForms: ["comprimé"] },
  { dci: "amiodarone", commonForms: ["comprimé"] },
  { dci: "dapagliflozine", commonForms: ["comprimé"] },
  { dci: "empagliflozine", commonForms: ["comprimé"] },
  { dci: "sacubitril/valsartan", commonForms: ["comprimé"] },
  { dci: "ivabradine", commonForms: ["comprimé"] },
  { dci: "digoxine", commonForms: ["comprimé"] },
];

export function searchDci(query: string, limit = 12): DciEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return DEMO_DCI_CATALOG.slice(0, limit);
  return DEMO_DCI_CATALOG.filter((e) => e.dci.includes(q)).slice(0, limit);
}
