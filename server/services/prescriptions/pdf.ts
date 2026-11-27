import { env } from "@/env";
import type { RxRecord } from "@/lib/prescriptions/record";
import type { PrescriptionLine } from "@/types/domain";

export type RxPdfInput = {
  rx: RxRecord;
  patientLabel: string;
  birthDate: string;
  prescriberName: string;
  rpps: string;
  cabinetName: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Échappement chaîne PDF littérale (octets WinAnsi). */
function escapePdfString(s: string): string {
  const normalized = s
    .replace(/[—–]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/•/g, "-")
    .replace(/…/g, "...");
  let out = "";
  for (const ch of normalized) {
    const code = ch.codePointAt(0) ?? 63;
    if (code === 0x5c) {
      out += "\\\\";
      continue;
    }
    if (code === 0x28) {
      out += "\\(";
      continue;
    }
    if (code === 0x29) {
      out += "\\)";
      continue;
    }
    if (code >= 0x20 && code <= 0x7e) {
      out += ch;
      continue;
    }
    if (code >= 0xa0 && code <= 0xff) {
      out += `\\${code.toString(8).padStart(3, "0")}`;
      continue;
    }
    out += "?";
  }
  return out;
}

function formatLineBlock(l: PrescriptionLine, index: number): string[] {
  const title = [l.dci || l.drug, l.dosage, l.form].filter(Boolean).join(" · ");
  const rows: string[] = [`${index}. ${title || "Médicament non renseigné"}`];
  if (l.posology?.trim()) rows.push(`   Posologie : ${l.posology.trim()}`);
  const meta = [
    l.route?.trim() ? `Voie : ${l.route.trim()}` : null,
    l.duration?.trim() ? `Durée : ${l.duration.trim()}` : null,
    l.quantity?.trim() ? `Quantité : ${l.quantity.trim()}` : null,
    l.renewals != null ? `Renouvellement : x${l.renewals}` : null,
  ].filter(Boolean);
  if (meta.length) rows.push(`   ${meta.join(" · ")}`);
  if (l.remarks?.trim()) rows.push(`   Remarque : ${l.remarks.trim()}`);
  if (l.ald) rows.push("   Zone ALD");
  return rows;
}

export function buildPrescriptionHtml(input: RxPdfInput): string {
  const ald = input.rx.lines.filter((l) => l.ald);
  const nonAld = input.rx.lines.filter((l) => !l.ald);

  const renderLines = (lines: typeof input.rx.lines) =>
    lines
      .map((l, i) => {
        const block = formatLineBlock(l, i + 1)
          .map((row) => escapeHtml(row))
          .join("<br/>");
        return `<li style="margin-bottom:10px">${block}</li>`;
      })
      .join("\n");

  const stamp = input.rx.status === "brouillon" ? `<div class="stamp">BROUILLON</div>` : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><title>Ordonnance</title>
<style>
@page{size:A4;margin:16mm}
body{font-family:system-ui,sans-serif;font-size:11pt;color:#1B2A47;line-height:1.35}
header{border-bottom:2px solid #0A1F44;padding-bottom:10px;margin-bottom:14px}
h1{font-size:13pt;margin:0 0 8px}
.zone{border:1px solid #C9D5EA;border-radius:8px;padding:12px;margin:12px 0}
.stamp{position:absolute;top:12mm;right:12mm;border:2px solid #B45309;color:#B45309;font-weight:800;padding:4px 10px;font-size:10pt}
footer{margin-top:24px;font-size:8pt;color:#52627F;border-top:1px solid #E3E9F4;padding-top:8px;display:flex;justify-content:space-between}
.muted{color:#52627F;font-size:9pt}
ul{padding-left:18px}
</style></head>
<body>
${stamp}
<header>
  <div style="font-size:14pt;font-weight:800">${escapeHtml(input.prescriberName)}</div>
  <div>${escapeHtml(input.cabinetName)}</div>
  <div class="muted">RPPS ${escapeHtml(input.rpps)}</div>
</header>
<p><strong>Patient :</strong> ${escapeHtml(input.patientLabel)} · né(e) le ${escapeHtml(input.birthDate)}<br/>
<strong>Date :</strong> ${escapeHtml(input.rx.updatedAt.slice(0, 10))} · <strong>Statut :</strong> ${escapeHtml(input.rx.status)}</p>
${
  input.rx.aldLayout
    ? `<div class="zone"><strong>Prescription relative aux affections de longue durée (ALD)</strong><ul>${renderLines(ald) || "<li>Aucune ligne ALD</li>"}</ul></div>
<div class="zone"><strong>Autres prescriptions</strong><ul>${renderLines(nonAld) || "<li>Aucune ligne</li>"}</ul></div>`
    : `<h1>Prescription</h1><ul>${renderLines(input.rx.lines) || "<li>—</li>"}</ul>`
}
<p class="muted">e-prescription : non disponible</p>
<footer>
  <span>${escapeHtml(input.rx.id)}</span>
  <span>Page 1 / 1</span>
</footer>
</body></html>`;
}

function buildPrescriptionPlainLines(input: RxPdfInput): string[] {
  const lines: string[] = [
    "ORDONNANCE",
    "",
    input.prescriberName,
    input.cabinetName,
    `RPPS ${input.rpps}`,
    "",
    `Patient : ${input.patientLabel}`,
    `Né(e) le ${input.birthDate}`,
    `Date : ${input.rx.updatedAt.slice(0, 10)}`,
    `Statut : ${input.rx.status}`,
    "",
    "Prescription",
    "------------",
  ];
  if (input.rx.lines.length === 0) {
    lines.push("Aucune ligne");
  } else {
    input.rx.lines.forEach((l, i) => {
      lines.push(...formatLineBlock(l, i + 1), "");
    });
  }
  lines.push("e-prescription : non disponible", "", input.rx.id);
  return lines;
}

/** PDF A4 minimal valide (Helvetica + WinAnsi) — fallback hors Gotenberg. */
export function buildMinimalTextPdf(plainLines: string[]): Uint8Array {
  const maxLines = 52;
  const truncated = plainLines.slice(0, maxLines);
  const contentParts = ["BT", "/F1 11 Tf", "15 TL", "50 800 Td"];
  for (let i = 0; i < truncated.length; i++) {
    if (i > 0) contentParts.push("T*");
    contentParts.push(`(${escapePdfString(truncated[i]!)}) Tj`);
  }
  contentParts.push("ET");
  const stream = Buffer.from(contentParts.join("\n"), "ascii");

  const objs: Buffer[] = [];
  const pushObj = (body: string | Buffer) => {
    objs.push(typeof body === "string" ? Buffer.from(body, "ascii") : body);
  };

  pushObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  pushObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  pushObj(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
  );
  pushObj(
    Buffer.concat([
      Buffer.from(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n`, "ascii"),
      stream,
      Buffer.from("\nendstream\nendobj\n", "ascii"),
    ]),
  );
  pushObj(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
  );

  const header = Buffer.from("%PDF-1.4\n", "ascii");
  const parts: Buffer[] = [header];
  const offsets: number[] = [0];
  let cursor = header.length;
  for (const obj of objs) {
    offsets.push(cursor);
    parts.push(obj);
    cursor += obj.length;
  }

  let xref = `xref\n0 ${objs.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i <= objs.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\n`;
  xref += `startxref\n${cursor}\n%%EOF\n`;
  parts.push(Buffer.from(xref, "ascii"));

  return new Uint8Array(Buffer.concat(parts));
}

export type RxPdfResult =
  | { ok: true; bytes: Uint8Array; contentType: "application/pdf"; mode: "gotenberg" | "fallback" }
  | { ok: false; error: string };

/**
 * HTML → PDF via Gotenberg ; sinon PDF texte A4 local (lisible hors ligne).
 */
export async function renderPrescriptionPdf(input: RxPdfInput): Promise<RxPdfResult> {
  const html = buildPrescriptionHtml(input);
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
    const bytes = buildMinimalTextPdf(buildPrescriptionPlainLines(input));
    return { ok: true, bytes, contentType: "application/pdf", mode: "fallback" };
  }
}

/** @deprecated Utiliser renderPrescriptionPdf */
export function renderPrescriptionPdfDemo(input: RxPdfInput): Uint8Array {
  return buildMinimalTextPdf(buildPrescriptionPlainLines(input));
}
