"use client";

import { useMemo, useState } from "react";
import type { Tenant } from "@/types/domain";
import { ROOT_DOMAIN } from "@/lib/tenant-host";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_VARIANT: Record<Tenant["status"], string> = {
  provisioning: "bg-muted text-muted-foreground",
  provisioning_failed: "bg-destructive/10 text-destructive",
  Actif: "bg-success-soft text-success",
  Essai: "bg-primary-soft text-primary",
  Suspendu: "bg-muted text-muted-foreground",
  "Paiement en échec": "bg-destructive/10 text-destructive",
  deleted: "bg-muted text-muted-foreground",
};

export function ConsoleTenantsClient({ tenants }: { tenants: Tenant[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tenants;
    return tenants.filter(
      (t) =>
        t.slug.includes(s) || t.name.toLowerCase().includes(s) || t.city?.toLowerCase().includes(s),
    );
  }, [tenants, q]);

  return (
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
      <TenantsTableBody tenants={filtered} />
    </section>
  );
}

function TenantsTableBody({ tenants }: { tenants: Tenant[] }) {
  return (
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {tenants.map((t) => (
            <TableRow key={t.id}>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
