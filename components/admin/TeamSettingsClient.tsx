"use client";

import { useState } from "react";
import type { Member } from "@/types/domain";
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  can,
  getDefaultPermissions,
  isRegulatoryLocked,
  setNursePermission,
  type Permission,
} from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Lock } from "lucide-react";

export function TeamSettingsClient({ members }: { members: Member[] }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [, tick] = useState(0);
  const nursePerms = new Set(getDefaultPermissions("INFIRMIERE"));
  const subject = { role: "MEDECIN" as const, isTenantAdmin: true };

  const toggle = (perm: Permission, on: boolean) => {
    setNursePermission(perm, on);
    tick((n) => n + 1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Équipe & rôles</h1>
        <p className="text-muted-foreground mt-1 text-sm">Matrice modifiable pour le rôle infirmière (verrous réglementaires).</p>
      </div>

      <section className="bg-card border-border rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Dernière connexion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <p className="font-bold">{m.name}</p>
                  <p className="text-muted-foreground text-xs">{m.email}</p>
                </TableCell>
                <TableCell>{m.role === "MEDECIN" ? "Médecin" : "Infirmière"}</TableCell>
                <TableCell>{m.mfa}</TableCell>
                <TableCell className="text-sm">{m.lastLoginLabel}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="bg-card border-border rounded-2xl border p-4">
        <h2 className="text-base font-extrabold">Permissions — rôle Infirmière</h2>
        <ul className="mt-4 space-y-3">
          {PERMISSIONS.filter((p) => p !== "console.manage" && p !== "tenant.admin").map((perm) => {
            const locked = isRegulatoryLocked(perm);
            const enabled = nursePerms.has(perm);
            return (
              <li key={perm} className="flex items-center justify-between gap-3 border-b pb-3 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{PERMISSION_LABELS[perm]}</p>
                  {locked ? (
                    <p className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Lock className="size-3" /> Réservé au médecin
                    </p>
                  ) : null}
                </div>
                <Switch
                  checked={enabled}
                  disabled={locked || !can(subject, "team.manage")}
                  onCheckedChange={(v) => toggle(perm, v)}
                  aria-label={PERMISSION_LABELS[perm]}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bg-card border-border flex flex-wrap items-end gap-2 rounded-2xl border p-4">
        <div className="min-w-[240px] flex-1">
          <label htmlFor="invite" className="text-sm font-semibold">
            Inviter par e-mail
          </label>
          <Input
            id="invite"
            type="email"
            placeholder="nom@cabinet-martin.fr"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="mt-1"
          />
        </div>
        <Button type="button" disabled={!inviteEmail.includes("@")}>
          Envoyer l&apos;invitation
        </Button>
      </section>
    </div>
  );
}