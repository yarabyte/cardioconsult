"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  exportAuditJournalCsv,
  fetchAuditJournal,
  type AuditJournalRow,
} from "@/server/actions/audit-journal";
import { SettingsSubnav } from "./SettingsSubnav";

export function AuditJournalClient({
  initialRows,
  integrityOk,
  integrityCount,
}: {
  initialRows: AuditJournalRow[];
  integrityOk: boolean;
  integrityCount: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [action, setAction] = useState("");
  const [actorId, setActorId] = useState("");
  const [integrity, setIntegrity] = useState({ ok: integrityOk, count: integrityCount });
  const [pending, start] = useTransition();

  function reload() {
    start(async () => {
      const r = await fetchAuditJournal({
        action: action || undefined,
        actorId: actorId || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setRows(r.rows);
      setIntegrity(r.integrity);
    });
  }

  useEffect(() => {
    // charge initiale déjà fournie
  }, []);

  function onExport() {
    start(async () => {
      const r = await exportAuditJournalCsv({
        action: action || undefined,
        actorId: actorId || undefined,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      const blob = new Blob(
        [`# exportedAt=${r.exportedAt}\n# signature=${r.signature}\n${r.csv}`],
        { type: "text/csv;charset=utf-8" },
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-${r.exportedAt.slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export CSV signé téléchargé (événement audité).");
      reload();
    });
  }

  return (
    <div className="flex flex-wrap items-start gap-5">
      <SettingsSubnav />
      <div className="flex min-w-0 flex-[999] basis-[560px] flex-col gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Sécurité & journal d&apos;audit
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Lecture seule. Identifiants techniques uniquement — aucune donnée clinique.
          </p>
        </div>

        <div
          className={
            integrity.ok
              ? "border-success/40 bg-success/5 rounded-xl border px-4 py-3 text-sm"
              : "border-destructive/40 bg-destructive/5 rounded-xl border px-4 py-3 text-sm"
          }
        >
          Intégrité de la chaîne : <strong>{integrity.ok ? "OK" : "RUPTURE DÉTECTÉE"}</strong> ·{" "}
          {integrity.count} événement(s)
        </div>

        <div className="bg-card border-border flex flex-wrap items-end gap-3 rounded-2xl border p-4">
          <div className="space-y-1">
            <Label htmlFor="f-action">Action</Label>
            <Input
              id="f-action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="patient.open"
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-actor">Acteur (id)</Label>
            <Input
              id="f-actor"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="uuid…"
              className="w-44"
            />
          </div>
          <Button type="button" variant="outline" disabled={pending} onClick={reload}>
            Filtrer
          </Button>
          <Button type="button" disabled={pending} onClick={onExport}>
            Exporter le journal (CSV signé)
          </Button>
        </div>

        <section className="bg-card border-border overflow-x-auto rounded-2xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Acteur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Résultat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-sm">
                    Aucun événement pour ces filtres.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {r.atLabel}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.actorId}</TableCell>
                    <TableCell className="text-sm font-semibold">{r.action}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {r.entityType}/{r.entityId}
                    </TableCell>
                    <TableCell className="text-sm">{r.outcome}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <p className="text-muted-foreground px-5 py-3 text-xs">
            Aucun endpoint de suppression. Journal append-only.
          </p>
        </section>
      </div>
    </div>
  );
}
