export type BillingInvoice = {
  id: string;
  tenantId: string;
  number: string;
  issuedAt: string;
  amountHtEur: number;
  vatRate: number;
  status: "paid" | "open" | "void";
  pdfUrl: string | null;
};

export type ProcessedWebhook = {
  eventId: string;
  type: string;
  processedAt: string;
};
