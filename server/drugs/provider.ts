import { searchDci, type DciEntry } from "@/lib/prescriptions/dci-catalog";

export type InteractionCheckResult = {
  status: "not_available" | "ok" | "alert";
  message: string;
};

export interface DrugDatabase {
  readonly id: string;
  searchDci(query: string): Promise<DciEntry[]>;
  checkInteractions(dcis: string[]): Promise<InteractionCheckResult>;
}

/** Interactions : NotAvailable tant qu'aucune base certifiée n'est branchée. */
export class NotAvailableDrugDatabase implements DrugDatabase {
  readonly id = "NotAvailable";

  async searchDci(query: string): Promise<DciEntry[]> {
    return searchDci(query);
  }

  async checkInteractions(_dcis: string[]): Promise<InteractionCheckResult> {
    return {
      status: "not_available",
      message: "Base médicamenteuse non connectée — vérification clinique nécessaire.",
    };
  }
}

export function getDrugDatabase(): DrugDatabase {
  return new NotAvailableDrugDatabase();
}
