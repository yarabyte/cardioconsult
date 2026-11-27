"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Member } from "@/types/domain";
import {
  INFIRMIERE_DEFAULT,
  NURSE_GRANTABLE,
  PERMISSION_LABELS,
  REGULATORY_LOCKED,
  can,
  getDefaultPermissions,
  isRegulatoryLocked,
  type Permission,
} from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lock } from "lucide-react";
import {
  changeMemberRole,
  disableMember,
  inviteMember,
  resendInvitation,
  resetMemberMfaAction,
  revokeInvitation,
  setNursePermissionAction,
} from "@/server/actions/team";

export type TeamInviteRow = {
  id: string;
  email: string;
  role: "MEDECIN" | "INFIRMIERE";
  createdLabel: string;
};

const MATRIX_ROWS: Permission[] = [
  "patient.read",
  "vitals.write",
  "appointment.write",
  "nursing.note.write",
  "exam.write",
  "stats.read",
  "document.sign",
  "prescription.validate",
];

export function TeamSettingsClient({
  members: initialMembers,
  invites: initialInvites,
  seatsUsed,
  seatsLimit,
  nurseExtra,
  currentUserId,
}: {
  members: Member[];
  invites: TeamInviteRow[];
  seatsUsed: number;
  seatsLimit: number;
  nurseExtra: Permission[];
  currentUserId?: string;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEDECIN" | "INFIRMIERE">("INFIRMIERE");
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [extra, setExtra] = useState<Permission[]>(nurseExtra);
  const [pending, startTransition] = useTransition();
  const subject = { role: "MEDECIN" as const, isTenantAdmin: true };

  const nursePerms = useMemo(
    () => new Set(getDefaultPermissions("INFIRMIERE", { nurseExtra: extra })),
    [extra],
  );

  const used = seatsUsed + (invites.length - initialInvites.length);

  function run(
    action: () => Promise<{
      ok: boolean;
      error?: { message: string };
      message?: string;
      inviteUrl?: string;
    }>,
  ) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) {
        toast.error(r.error?.message ?? "Échec");
        return;
      }
      toast.success(r.message ?? "OK");
      if (r.inviteUrl) {
        toast.message(`Lien d'invitation (démo) : ${r.inviteUrl}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Équipe & rôles</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Membres ({Math.min(used, seatsLimit)} / {seatsLimit} sièges) · réservé à
          l&apos;administrateur.
        </p>
      </div>

      <section className="bg-card border-border rounded-2xl border">
        <div className="border-border flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-base font-extrabold">Membres</h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Membre</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>MFA</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isSelf =
                currentUserId && (m.userId === currentUserId || m.id === currentUserId);
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <p className="font-bold">{m.name}</p>
                    <p className="text-muted-foreground text-xs">{m.email}</p>
                  </TableCell>
                  <TableCell>
                    {m.role === "MEDECIN"
                      ? m.isTenantAdmin
                        ? "Médecin · admin"
                        : "Médecin"
                      : "Infirmière"}
                  </TableCell>
                  <TableCell
                    className={
                      m.mfa === "Activée" ? "text-success font-bold" : "text-warning font-bold"
                    }
                  >
                    {m.mfa}
                  </TableCell>
                  <TableCell className="text-sm">{m.lastLoginLabel}</TableCell>
                  <TableCell className="space-x-2 text-right text-sm">
                    {isSelf ? (
                      <span className="text-muted-foreground">Vous</span>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              const nextRole = m.role === "MEDECIN" ? "INFIRMIERE" : "MEDECIN";
                              const r = await changeMemberRole({
                                memberId: m.id,
                                role: nextRole,
                                isTenantAdmin: false,
                              });
                              if (r.ok) {
                                setMembers((prev) =>
                                  prev.map((x) =>
                                    x.id === m.id
                                      ? { ...x, role: nextRole, isTenantAdmin: false }
                                      : x,
                                  ),
                                );
                              }
                              return r;
                            })
                          }
                        >
                          Rôle
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              const r = await resetMemberMfaAction({ memberId: m.id });
                              if (r.ok) {
                                setMembers((prev) =>
                                  prev.map((x) =>
                                    x.id === m.id ? { ...x, mfa: "En attente" } : x,
                                  ),
                                );
                              }
                              return r;
                            })
                          }
                        >
                          Reset MFA
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() =>
                            run(async () => {
                              const r = await disableMember({ memberId: m.id });
                              if (r.ok) {
                                setMembers((prev) => prev.filter((x) => x.id !== m.id));
                              }
                              return r;
                            })
                          }
                        >
                          Désactiver
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {invites.map((inv) => (
              <TableRow key={inv.id} className="bg-warning/5">
                <TableCell>
                  <p className="font-bold">{inv.email}</p>
                  <p className="text-muted-foreground text-xs">Invitation</p>
                </TableCell>
                <TableCell>{inv.role === "MEDECIN" ? "Médecin" : "Infirmière"}</TableCell>
                <TableCell className="text-warning font-bold">En attente</TableCell>
                <TableCell className="text-warning text-sm">{inv.createdLabel}</TableCell>
                <TableCell className="space-x-2 text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => run(async () => resendInvitation({ invitationId: inv.id }))}
                  >
                    Relancer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const r = await revokeInvitation({ invitationId: inv.id });
                        if (r.ok) setInvites((prev) => prev.filter((x) => x.id !== inv.id));
                        return r;
                      })
                    }
                  >
                    Révoquer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="border-border bg-muted/30 flex flex-wrap items-end gap-3 border-t p-4">
          <div className="min-w-[220px] flex-1 space-y-1">
            <Label htmlFor="invite">Inviter par e-mail</Label>
            <Input
              id="invite"
              type="email"
              placeholder="prenom.nom@cabinet.fr"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Rôle</Label>
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as "MEDECIN" | "INFIRMIERE")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INFIRMIERE">Infirmière</SelectItem>
                <SelectItem value="MEDECIN">Médecin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={pending || !inviteEmail.includes("@") || used >= seatsLimit}
            onClick={() =>
              run(async () => {
                const r = await inviteMember({ email: inviteEmail, role: inviteRole });
                if (r.ok) {
                  setInvites((prev) => [
                    ...prev,
                    {
                      id: crypto.randomUUID(),
                      email: inviteEmail.toLowerCase(),
                      role: inviteRole,
                      createdLabel: "À l'instant",
                    },
                  ]);
                  setInviteEmail("");
                }
                return r;
              })
            }
          >
            Envoyer l&apos;invitation
          </Button>
        </div>
      </section>

      <section className="bg-card border-border overflow-x-auto rounded-2xl border">
        <div className="border-border border-b px-5 py-4">
          <h2 className="text-base font-extrabold">Matrice des permissions</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Accès refusé par défaut. Cases verrouillées : signature et validation d&apos;ordonnance
            (médecin uniquement).
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Permission</TableHead>
              <TableHead className="w-32 text-center">Médecin</TableHead>
              <TableHead className="w-36 text-center">Infirmière</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MATRIX_ROWS.map((perm) => {
              const locked = isRegulatoryLocked(perm);
              const enabled = nursePerms.has(perm);
              const grantable =
                (NURSE_GRANTABLE as readonly string[]).includes(perm) ||
                (INFIRMIERE_DEFAULT as readonly string[]).includes(perm);
              return (
                <TableRow key={perm}>
                  <TableCell>
                    <span className="text-sm font-semibold">{PERMISSION_LABELS[perm] ?? perm}</span>
                    {locked ? (
                      <span className="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold">
                        verrouillé
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-center">
                    <span
                      className="bg-primary text-primary-foreground inline-flex size-6 items-center justify-center rounded-md text-xs font-extrabold"
                      aria-label="Autorisé"
                    >
                      ✓
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    {locked || !grantable ? (
                      <span className="text-muted-foreground inline-flex size-6 items-center justify-center rounded-md border text-xs">
                        {locked ? <Lock className="size-3" /> : ""}
                      </span>
                    ) : (
                      <Switch
                        checked={enabled}
                        disabled={pending || !can(subject, "team.manage")}
                        onCheckedChange={(v) =>
                          run(async () => {
                            const r = await setNursePermissionAction({
                              permission: perm,
                              enabled: v,
                            });
                            if (r.ok) {
                              setExtra((prev) => {
                                const s = new Set(prev);
                                if (v) s.add(perm);
                                else s.delete(perm);
                                return [...s];
                              });
                            }
                            return r;
                          })
                        }
                        aria-label={`${PERMISSION_LABELS[perm]} pour Infirmière`}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="text-muted-foreground px-5 py-3 text-xs">
          Aperçu : avec la matrice actuelle, l&apos;infirmière{" "}
          {nursePerms.has("exam.write") ? "peut" : "ne peut pas"} saisir d&apos;examens ·{" "}
          {nursePerms.has("stats.read") ? "peut" : "ne peut pas"} voir les statistiques ·{" "}
          {REGULATORY_LOCKED.every((p) => !nursePerms.has(p))
            ? "ne peut jamais signer ni valider une ordonnance"
            : "—"}
          .
        </p>
      </section>
    </div>
  );
}
