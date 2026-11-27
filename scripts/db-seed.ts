import { uuidv7 } from "uuidv7";
import { eq, sql } from "drizzle-orm";
import { members, tenants, users } from "@/db/control/schema";
import { patients } from "@/db/tenant/schema";
import { user as authUser } from "@/db/control/auth-schema";
import { getControlDb, closeControlDb } from "@/server/db/control-db";
import { withTenantDb, closeTenantPools } from "@/server/db/tenant-db";
import { SYNTHETIC_PATIENTS } from "@/db/seed/synthetic-patients";
import { seedSyntheticPatients } from "@/db/seed/seed-tenant-demo";
import { seedDemoWorkflowArtifacts } from "@/db/seed/seed-workflow-demo";
import { provisionTenant } from "@/server/jobs/tenant-provision";
import { auth } from "@/server/auth/auth";

const DEMO_ADMIN_EMAIL = "c.martin@cabinet-martin.fr";
const DEMO_ADMIN_PASSWORD = "motdepasse-demo-12";
const DEMO_ADMIN_NAME = "Dr Claire Martin";

/** Crée (ou récupère) le compte Better Auth — source de vérité pour `members.user_id`. */
async function ensureAuthUser(): Promise<{ id: string; email: string; name: string }> {
  const control = getControlDb();
  const [existing] = await control
    .select()
    .from(authUser)
    .where(eq(authUser.email, DEMO_ADMIN_EMAIL))
    .limit(1);
  if (existing) {
    return { id: existing.id, email: existing.email, name: existing.name };
  }

  const signed = await auth.api.signUpEmail({
    body: {
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
      name: DEMO_ADMIN_NAME,
    },
  });
  // Compte démo local : e-mail considéré vérifié (pas d’attente boîte mail).
  await control
    .update(authUser)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(authUser.id, signed.user.id));
  return { id: signed.user.id, email: signed.user.email, name: signed.user.name };
}

/**
 * Aligne `users` + `members` sur l'id Better Auth (évite member.missing après login).
 */
async function linkMemberToAuthUser(
  tenantId: string,
  auth: { id: string; email: string; name: string },
): Promise<void> {
  const control = getControlDb();

  // Ancienne ligne users (uuid provision) avec le même e-mail → libérer l'e-mail puis créer l'id auth
  const legacy = await control.select().from(users).where(eq(users.email, auth.email));
  for (const row of legacy) {
    if (row.id === auth.id) continue;
    await control
      .update(users)
      .set({ email: `${auth.email}.legacy-${row.id}`, updatedAt: new Date() })
      .where(eq(users.id, row.id));
  }

  await control
    .insert(users)
    .values({
      id: auth.id,
      email: auth.email,
      name: auth.name,
      emailVerified: true,
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: auth.email,
        name: auth.name,
        emailVerified: true,
        updatedAt: new Date(),
      },
    });
  await control
    .update(authUser)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(authUser.id, auth.id));

  for (const row of legacy) {
    if (row.id === auth.id) continue;
    await control
      .update(members)
      .set({ userId: auth.id, updatedAt: new Date() })
      .where(eq(members.userId, row.id));
    await control.delete(users).where(eq(users.id, row.id));
  }

  const [existingMember] = await control
    .select()
    .from(members)
    .where(eq(members.tenantId, tenantId))
    .limit(1);

  if (!existingMember) {
    await control.insert(members).values({
      id: uuidv7(),
      userId: auth.id,
      tenantId,
      role: "MEDECIN",
      isTenantAdmin: true,
      status: "active",
    });
  } else if (existingMember.userId !== auth.id) {
    await control
      .update(members)
      .set({ userId: auth.id, updatedAt: new Date() })
      .where(eq(members.id, existingMember.id));
  }
}

async function main() {
  const control = getControlDb();
  const slug = "dr-martin";

  // Auth d'abord — l'id Better Auth devient l'id membre
  const authAccount = await ensureAuthUser();

  let [tenant] = await control.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
  if (!tenant) {
    const id = uuidv7();
    await control.insert(tenants).values({
      id,
      slug,
      name: "Cabinet Dr Martin",
      plan: "cabinet",
      status: "provisioning",
      demoDataEnabled: false,
    });
    tenant = (await control.select().from(tenants).where(eq(tenants.id, id)).limit(1))[0]!;
  }

  if (tenant.status !== "active" && tenant.status !== "trial") {
    await provisionTenant({
      tenantId: tenant.id,
      adminUser: {
        email: DEMO_ADMIN_EMAIL,
        name: DEMO_ADMIN_NAME,
        userId: authAccount.id,
      },
    });
  }

  await linkMemberToAuthUser(tenant.id, authAccount);

  const count = await withTenantDb(tenant.id, async (db) => {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(patients);
    return row?.n ?? 0;
  });

  if (count === 0) {
    await seedSyntheticPatients(tenant.id);
  } else {
    await seedDemoWorkflowArtifacts(tenant.id);
  }

  console.log(
    `Seed OK — tenant ${slug}, ${count === 0 ? SYNTHETIC_PATIENTS.length : count} patients synthétiques.`,
  );

  console.log(
    `Auth démo : ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD} (MFA à enrôler à la 1ʳᵉ connexion).`,
  );
  await closeTenantPools();
  await closeControlDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
