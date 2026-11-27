"use client";

import { useMemo, useState, useTransition } from "react";
import type { Tenant } from "@/types/domain";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { consoleTenantAction, requestSupportSessionAction } from "@/server/actions/console";
import type { ConsoleTenantOps } from "@/server/console/types";
import type { SupportSessionRecord } from "@/server/support/types";
import { formatDateTime } from "@/lib/format";
import { ROOT_DOMAIN } from "@/lib/tenant-host";

const STATUS_VARIANT: Record<Tenant["status"], string> = {
  provisioning: "bg-muted text-muted-foreground",
  provisioning_failed: "bg-destructive/10 text-destructive",
  Actif: "bg-success-soft text-success",
  Essai: "bg-primary-soft text-primary",
  Suspendu: "bg-muted text-muted-foreground",
  "Paiement en échec": "bg-destructive/10 text-destructive",
  deleted: "bg-muted text-muted-foreground",
};

type ActionKey =
  | "suspend"
  | "reactivate"
  | "retry_provision"
  | "rpps_verify"
  | "rpps_reject"
  | "export"
  | "flag"
  | "hospitalisation_activate";

export function ConsoleOpsClient({
  initialTenants,
  supervision,
  initialSupport,
}: {
  initialTenants: Tenant[];
  supervision: {
    tenantsWithFailedJobs: number;
    oldestCert: string | null;
    lastGlobalBackup: string;
    lastRestoreTest: string;
    migrationSkew: number;
  };
  initialSupport: SupportSessionRecord[];
}) {
  const [tenants, setTenants] = useState(initialTenants);
  const [support, setSupport] = useState(initialSupport);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(initialTenants[0]?.id ?? "");
  const [justification, setJustification] = useState("");
  const [ops, setOps] = useState<ConsoleTenantOps | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tenants;
    return tenants.filter(
      (t) =>
        t.slug.includes(s) || t.name.toLowerCase().includes(s) || t.city?.toLowerCase().includes(s),
    );
  }, [tenants, q]);

  const selected = tenants.find((t) => t.id === selectedId) ?? null;

  const run = (action: ActionKey, extra?: { flag?: string; flagEnabled?: boolean }) => {
    if (!selected) return;
    start(async () => {
      const r = await consoleTenantAction({
        tenantId: selected.id,
        action,
        justification,
        flag: extra?.flag as "clinical.scores" | undefined,
        flagEnabled: extra?.flagEnabled,
      });
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setTenants(r.tenants);
      setOps(r.ops);
      setMessage(`Action « ${action} » enregistrée (audit plateforme).`);
      setJustification("");
    });
  };

  const askSupport = () => {
    if (!selected) return;
    start(async () => {
      const r = await requestSupportSessionAction({
        tenantId: selected.id,
        reason: justification || "Assistance technique demandée depuis la console",
      });
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      setSupport((s) => [r.session, ...s]);
      setMessage("Demande support envoyée — en attente du consentement cabinet.");
      setJustification("");
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SupCard
          label="Jobs en échec (tenants)"
          value={String(supervision.tenantsWithFailedJobs)}
        />
        <SupCard label="Dernière sauvegarde" value={formatDateTime(supervision.lastGlobalBackup)} />
        <SupCard
          label="Dernier test restauration"
          value={formatDateTime(supervision.lastRestoreTest)}
        />
        <SupCard
          label="Cert. TLS (plus proche)"
          value={supervision.oldestCert ? formatDateTime(supervision.oldestCert) : "—"}
        />
      </section>

      {message ? (
        <p role="status" className="text-primary text-sm font-semibold">
          {message}
        </p>
      ) : null}

      <section className="bg-card border-border overflow-hidden rounded-2xl border">
        <div className="border-separator flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
          <h2 className="text-lg font-extrabold">Cabinets (tenants)</h2>
          <Input
            className="max-w-xs"
            placeholder="Rechercher un sous-domaine…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Rechercher un sous-domaine"
          />
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Offre</TableHead>
                <TableHead>Utilisateurs</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Stockage</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => (
                <TableRow key={t.id} data-selected={t.id === selectedId}>
                  <TableCell>
                    <strong>{t.slug}</strong>.{ROOT_DOMAIN}
                    <p className="text-muted-foreground text-xs">{t.name}</p>
                  </TableCell>
                  <TableCell>{t.plan}</TableCell>
                  <TableCell>{t.usersLabel}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                  </TableCell>
                  <TableCell>{t.storageLabel}</TableCell>
                  <TableCell className="text-sm">{t.lastActivityLabel}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant={t.id === selectedId ? "default" : "outline"}
                      onClick={() => setSelectedId(t.id)}
                    >
                      Gérer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {selected ? (
        <section className="border-border bg-card space-y-4 rounded-2xl border p-4">
          <h2 className="text-base font-extrabold">
            Actions · {selected.slug}{" "}
            <span className="text-muted-foreground text-sm font-semibold">
              (justificatif obligatoire — audit plateforme)
            </span>
          </h2>
          {ops ? (
            <p className="text-muted-foreground text-xs">
              Migrations {ops.migrationVersion} · RPPS {ops.rppsStatus} · jobs échec{" "}
              {ops.failedJobs}
              {ops.provisionError ? ` · ${ops.provisionError}` : ""}
            </p>
          ) : null}
          <div>
            <Label htmlFor="justif">Justificatif</Label>
            <Textarea
              id="justif"
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Motif de l'action sensible…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={() => run("suspend")}>
              Suspendre
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run("reactivate")}
            >
              Réactiver
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run("retry_provision")}
            >
              Relancer provisioning
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run("rpps_verify")}
            >
              Valider RPPS
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run("rpps_reject")}
            >
              Rejeter RPPS
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run("flag", { flag: "clinical.scores", flagEnabled: true })}
            >
              Activer scores
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run("hospitalisation_activate")}
            >
              Module hospitalisation
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={() => run("export")}
            >
              Export réversibilité
            </Button>
            <Button type="button" size="sm" disabled={pending} onClick={askSupport}>
              Demander session support
            </Button>
          </div>
        </section>
      ) : null}

      <section className="border-border bg-card rounded-2xl border p-4">
        <h2 className="mb-3 text-base font-extrabold">Sessions support</h2>
        <ul className="space-y-2 text-sm">
          {support.length === 0 ? (
            <li className="text-muted-foreground">Aucune session.</li>
          ) : (
            support.slice(0, 8).map((s) => (
              <li key={s.id} className="border-border rounded-lg border px-3 py-2">
                <strong>{s.tenantId}</strong> · {s.status} · {s.platformActorLabel}
                <p className="text-muted-foreground text-xs">{s.reason}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function SupCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-card rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-xs font-semibold">{label}</p>
      <p className="mt-1 text-sm font-extrabold">{value}</p>
    </div>
  );
}
