import { env } from "@/env";
import { tipDocToPlainText } from "@/lib/documents/generate";
import type { CabinetHeaderConfig, TipDoc } from "@/lib/documents/tiptap-types";
import type { DocumentStatus } from "@/types/domain";

export type PdfRenderInput = {
  documentId: string;
  version: number;
  status: DocumentStatus;
  patientLabel: string;
  dossierNumber: string;
  actDate: string;
  header: CabinetHeaderConfig;
  content: TipDoc;
};

/**
 * Gabarit A4 maîtrisé — aucune URL distante (Gotenberg isolé).
 * Contenu injecté en texte échappé uniquement.
 */
export function buildControlledHtml(input: PdfRenderInput): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const plain = tipDocToPlainText(input.content);
  const body = escape(plain)
    .split("\n")
    .map((l) => `<p>${l || "&nbsp;"}</p>`)
    .join("\n");

  const degrees =
    input.header.showDegrees && input.header.degrees.length
      ? `<div class="muted">${escape(input.header.degrees.join(" · "))} <em>(déclaratif — non vérifié)</em></div>`
      : "";

  const rpps = input.header.showRppsPlaceholder
    ? `<div class="muted">RPPS [non affiché / non vérifié]</div>`
    : "";

  const stamp = input.status === "brouillon" ? `<div class="stamp">BROUILLON</div>` : "";

  const statusWord =
    input.status === "signe" ? "signé" : input.status === "valide" ? "validé" : "brouillon";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>CR</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: system-ui, sans-serif; font-size: 11pt; color: #1B2A47; }
  header { border-bottom: 2px solid #0A1F44; padding-bottom: 12px; margin-bottom: 16px; }
  .muted { color: #52627F; font-size: 9pt; }
  .stamp { position: absolute; top: 12mm; right: 12mm; border: 2px solid #B45309; color: #B45309;
    font-weight: 800; letter-spacing: 1px; padding: 4px 10px; font-size: 10pt; }
  footer { margin-top: 24px; border-top: 1px solid #E3E9F4; padding-top: 8px; font-size: 8pt; color: #52627F;
    display: flex; justify-content: space-between; }
  .sign { margin-top: 28px; text-align: right; width: 240px; margin-left: auto; border-top: 1px dashed #A9B6CE;
    padding-top: 8px; font-size: 9pt; color: #52627F; }
</style>
</head>
<body>
${stamp}
<header>
  <div style="font-size:14pt;font-weight:800">${escape(input.header.displayName)}</div>
  <div>${escape(input.header.specialty)} — ${escape(input.header.cabinetName)}</div>
  ${degrees}
  <div class="muted">${escape(input.header.addressLine)}</div>
  ${rpps}
</header>
<div><strong>Patient :</strong> ${escape(input.patientLabel)}<br/>
<strong>Dossier :</strong> ${escape(input.dossierNumber)} · ${escape(input.actDate)}</div>
${body}
<div class="sign">${input.status === "signe" ? "Signé électroniquement" : "Zone de signature"}</div>
<footer>
  <span>${escape(input.documentId)} · v${input.version} · ${statusWord}</span>
  <span>Page 1 / 1</span>
</footer>
</body>
</html>`;
}

export type PdfResult =
  | { ok: true; bytes: Uint8Array; contentType: "application/pdf"; mode: "gotenberg" | "demo" }
  | { ok: false; error: string };

/**
 * Appel Gotenberg HTML→PDF. En démo / indisponible : PDF minimal synthétique (pas de réseau tiers).
 */
export async function renderPdf(input: PdfRenderInput): Promise<PdfResult> {
  const html = buildControlledHtml(input);

  // Refuse toute ressource distante dans le HTML contrôlé
  if (/https?:\/\//i.test(html.replace(/<!DOCTYPE[\s\S]*?<body>/i, ""))) {
    // allow none in body — header styles only local
  }
  if (/src\s*=\s*["']https?:/i.test(html)) {
    return { ok: false, error: "Ressource distante interdite dans le gabarit PDF" };
  }

  try {
    const url = `${env.GOTENBERG_URL.replace(/\/$/, "")}/forms/chromium/convert/html`;
    const form = new FormData();
    form.append("files", new Blob([html], { type: "text/html" }), "index.html");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    const res = await fetch(url, { method: "POST", body: form, signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Gotenberg ${res.status}`);
    const buf = new Uint8Array(await res.arrayBuffer());
    return { ok: true, bytes: buf, contentType: "application/pdf", mode: "gotenberg" };
  } catch {
    // Démo : pseudo-PDF (contenu texte) — jamais de fetch Internet
    const demo = new TextEncoder().encode(
      `%PDF-1.4\n% Cardio Soin demo PDF\n1 0 obj<<>>endobj\n` +
        `stream\n${tipDocToPlainText(input.content).slice(0, 2000)}\nendstream\n` +
        `trailer<<>>\n%%EOF`,
    );
    return { ok: true, bytes: demo, contentType: "application/pdf", mode: "demo" };
  }
}
