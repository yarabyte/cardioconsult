import { and, eq, inArray, isNull } from "drizzle-orm";
import { invitations, members, tenants } from "@/db/control/schema";
import { getControlDb } from "@/server/db/control-db";
import { seatLimitForPlan } from "@/lib/rbac";

export async function countOccupiedSeats(
  tenantId: string,
  plan: string,
): Promise<{
  used: number;
  limit: number;
}> {
  const limit = seatLimitForPlan(plan);

  const control = getControlDb();
  const active = await control
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.tenantId, tenantId), inArray(members.status, ["active", "invited"])));
  const pendingInvites = await control
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.tenantId, tenantId),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
      ),
    );
  return { used: active.length + pendingInvites.length, limit };
}

export async function assertSeatAvailable(tenantId: string): Promise<void> {
  const control = getControlDb();
  const [t] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!t) throw new Error("TENANT");
  const seats = await countOccupiedSeats(tenantId, t.plan);
  if (seats.used >= seats.limit) throw new Error("SEAT_LIMIT");
}
