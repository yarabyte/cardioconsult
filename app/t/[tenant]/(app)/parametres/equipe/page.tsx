import { and, eq, isNull } from "drizzle-orm";
import { TeamSettingsClient } from "@/components/admin/TeamSettingsClient";
import { SettingsSubnav } from "@/components/admin/SettingsSubnav";
import { getNurseExtrasForTenant } from "@/server/actions/team";
import { requireTenantPage } from "@/server/auth/require-tenant-page";
import { getControlDb } from "@/server/db/control-db";
import { invitations, members, tenants, users } from "@/db/control/schema";
import { countOccupiedSeats } from "@/server/team/seats";
import type { Member } from "@/types/domain";

type Props = PageProps<"/t/[tenant]/parametres/equipe">;

export const metadata = { title: "Paramètres équipe" };

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export default async function EquipePage({ params }: Props) {
  const { tenant: slug } = await params;
  const ctx = await requireTenantPage({ permission: "team.manage" });
  if (ctx.tenant.slug !== slug) return null;

  const control = getControlDb();
  const [tenantRow] = await control
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenant.id))
    .limit(1);

  const memberRows = await control
    .select({
      member: members,
      user: users,
    })
    .from(members)
    .innerJoin(users, eq(users.id, members.userId))
    .where(eq(members.tenantId, ctx.tenant.id));

  const teamMembers: Member[] = memberRows.map(({ member, user }) => ({
    id: member.id,
    tenantId: member.tenantId,
    userId: member.userId,
    name: user.name,
    email: user.email,
    role: member.role,
    isTenantAdmin: member.isTenantAdmin,
    status: member.status,
    initials: initialsFromName(user.name),
    mfa: "Activée",
    lastLoginLabel: "—",
  }));

  const pendingInvites = await control
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.tenantId, ctx.tenant.id),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    );

  const demoInvites = pendingInvites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    createdLabel: "Invitation en cours",
  }));

  const nurseExtra = await getNurseExtrasForTenant(ctx.tenant.id);
  const seats = await countOccupiedSeats(ctx.tenant.id, tenantRow?.plan ?? "cabinet");

  return (
    <div className="flex flex-wrap items-start gap-5">
      <SettingsSubnav />
      <div className="min-w-0 flex-[999] basis-[560px]">
        <TeamSettingsClient
          members={teamMembers}
          invites={demoInvites}
          seatsUsed={seats.used}
          seatsLimit={seats.limit}
          nurseExtra={nurseExtra}
          currentUserId={ctx.user.id}
        />
      </div>
    </div>
  );
}
