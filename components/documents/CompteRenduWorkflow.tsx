"use client";

import { useState } from "react";
import type { Document, DocumentStatus } from "@/types/domain";
import { can } from "@/lib/rbac";
import type { DemoUser } from "@/types/domain";
import { StatusBadge } from "@/components/clinical/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatDateTime } from "@/lib/format";

const STEPS: DocumentStatus[] = ["brouillon", "valide", "signe"];

export function CompteRenduWorkflow({
  doc: initial,
  user,
}: {
  doc: Document;
  user: DemoUser;
}) {
  const [doc, setDoc] = useState(initial);
  const maySign = can(user, "document.sign");

  const advance = () => {
    const i = STEPS.indexOf(doc.status);
    if (i < 0 || i >= STEPS.length - 1) return;
    const next = STEPS[i + 1]!;
    setDoc((d) => ({
      ...d,
      status: next,
      version: next === "brouillon" ? d.version : d.version + (next === "valide" ? 0 : 0),
      signedAt: next === "signe" ? new Date().toISOString() : d.signedAt,
      signedBy: next === "signe" ? user.name : d.signedBy,
    }));
  };

  const regenerate = () => {
    setDoc((d) => ({
      ...d,
      version: d.version + 1,
      sourceModified: false,
      status: "brouillon",
      contentHtml: d.contentHtml + "<p><em>Nouvelle version générée depuis les sources.</em></p>",
    }));
  };

  const statusVariant =
    doc.status === "signe" ? "valide" : doc.status === "valide" ? "calcule" : "incomplet";

  return (
    <div className="flex flex-col gap-4">
      <DocHeader title={doc.title} statusVariant={statusVariant} status={doc.status} version={doc.version} />

      {doc.sourceModified ? (
        <Alert variant="destructive">
          <AlertTitle>Données sources modifiées</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            Le brouillon peut être obsolète.
            <Button type="button" variant="outline" size="sm" onClick={regenerate}>
              Régénérer (v{doc.version + 1})
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="relative overflow-hidden">
        {doc.status === "brouillon" ? (
          <div
            aria-hidden
            className="text-muted-foreground/15 pointer-events-none absolute inset-0 flex rotate-[-18deg] items-center justify-center text-6xl font-extrabold"
          >
            BROUILLON
          </div>
        ) : null}
        <CardHeader>
          <CardTitle className="text-base">Aperçu A4</CardTitle>
        </CardHeader>
        <CardContent
          className="prose prose-sm max-w-none min-h-[280px] rounded-xl border bg-white p-6 shadow-sm"
          dangerouslySetInnerHTML={{ __html: doc.contentHtml }}
        />
      </Card>

      <div className="flex flex-wrap gap-2">
        {doc.status !== "signe" ? (
          <Button type="button" onClick={advance} disabled={!maySign && doc.status === "valide"}>
            {doc.status === "brouillon" ? "Valider le compte rendu" : "Signer (e-CPS simulée)"}
          </Button>
        ) : (
          <p className="text-success text-sm font-semibold">
            Signé le {doc.signedAt ? formatDateTime(doc.signedAt) : "—"} · {doc.signedBy}
          </p>
        )}
      </div>
    </div>
  );
}

function DocHeader({
  title,
  statusVariant,
  status,
  version,
}: {
  title: string;
  statusVariant: "valide" | "calcule" | "incomplet";
  status: DocumentStatus;
  version: number;
}) {
  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge variant={statusVariant} label={STATUS_LABELS[status]} />
        <span className="text-muted-foreground text-sm">Version {version}</span>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<DocumentStatus, string> = {
  brouillon: "Brouillon",
  valide: "Validé",
  signe: "Signé",
};