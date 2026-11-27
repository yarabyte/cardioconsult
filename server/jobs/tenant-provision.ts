import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import { env } from "@/env";
import { members, tenantDbSecrets, tenantDeks, tenants, users } from "@/db/control/schema";
import { createAdminPool, getControlDb } from "@/server/db/control-db";
import { generateDek, getKeyManager } from "@/server/crypto";
import { encryptDbPassword } from "@/server/crypto/db-password";
import { logger } from "@/lib/logging/logger";

export const TENANT_PROVISION_QUEUE = "tenant.provision";

export interface TenantProvisionPayload {
  tenantId: string;
  adminUser?: {
    email: string;
    name: string;
    /** Id Better Auth — obligatoire pour que `members.user_id` matche la session. */
    userId?: string;
  };
}

function shortId(tenantId: string): string {
  return tenantId.replace(/-/g, "").slice(0, 12);
}

function dbNames(tenantId: string) {
  const short = shortId(tenantId);
  return {
    dbName: `cc_t_${short}`,
    roleName: `cc_t_${short}_app`,
  };
}

async function setStep(tenantId: string, step: string, error?: string) {
  const control = getControlDb();
  await control
    .update(tenants)
    .set({
      provisionStep: step,
      provisionError: error ?? null,
      status: error ? "provisioning_failed" : "provisioning",
      updatedAt: new Date(),
    })
    .where(eq(tenants.id, tenantId));
}

async function applyTenantMigrations(dbName: string) {
  const files = [
    "0000_init.sql",
    "0001_audit_outbox.sql",
    "0002_patients.sql",
    "0003_agenda.sql",
    "0004_examens_fichiers.sql",
  ];
  const { default: pg } = await import("pg");
  const tenantAdminUrl = env.DATABASE_ADMIN_URL.replace(/\/[^/]+$/, `/${dbName}`);
  const pool = new pg.Pool({ connectionString: tenantAdminUrl, max: 1 });
  try {
    for (const file of files) {
      const sqlPath = path.join(process.cwd(), "db/tenant/migrations", file);
      const sql = await readFile(sqlPath, "utf8");
      await pool.query(sql);
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
        id SERIAL PRIMARY KEY,
        hash text NOT NULL,
        created_at bigint
      );
    `);
    for (const tag of [
      "0000_init",
      "0001_audit_outbox",
      "0002_patients",
      "0003_agenda",
      "0004_examens_fichiers",
    ]) {
      await pool.query(
        `INSERT INTO "__drizzle_migrations" (hash, created_at) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [tag, Date.now()],
      );
    }
  } finally {
    await pool.end();
  }
}

/**
 * Provisioning idempotent d'un tenant (règle 04).
 * Étapes rejouables ; échec → status provisioning_failed.
 */
export async function provisionTenant(payload: TenantProvisionPayload): Promise<void> {
  const { tenantId } = payload;
  const control = getControlDb();
  const [tenant] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) throw new Error(`Tenant ${tenantId} introuvable`);
  if (tenant.status === "active" && tenant.dbName) {
    logger.info({ tenantId, event: "tenant.provision.skip" }, "Tenant déjà actif");
    return;
  }

  const { dbName, roleName } = dbNames(tenantId);
  if (!/^cc_t_[a-z0-9]+$/.test(dbName) || !/^cc_t_[a-z0-9]+_app$/.test(roleName)) {
    throw new Error("Identifiants DB tenant invalides.");
  }
  const admin = createAdminPool();
  const password = randomBytes(24).toString("base64url");

  try {
    // 1. Rôle + base + REVOKE PUBLIC (identifiants via format %I / %L — pas d'interpolation brute du secret)
    await setStep(tenantId, "create_role_db");
    const roleExists = await admin.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [roleName]);
    if ((roleExists.rowCount ?? 0) === 0) {
      const { rows } = await admin.query<{ ddl: string }>(
        `SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', $1::text, $2::text) AS ddl`,
        [roleName, password],
      );
      await admin.query(rows[0]!.ddl);
    } else {
      const { rows } = await admin.query<{ ddl: string }>(
        `SELECT format('ALTER ROLE %I WITH PASSWORD %L', $1::text, $2::text) AS ddl`,
        [roleName, password],
      );
      await admin.query(rows[0]!.ddl);
    }
    const dbExists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (dbExists.rowCount === 0) {
      const { rows } = await admin.query<{ ddl: string }>(
        `SELECT format('CREATE DATABASE %I OWNER %I', $1::text, $2::text) AS ddl`,
        [dbName, roleName],
      );
      await admin.query(rows[0]!.ddl);
    }
    {
      const rev = await admin.query<{ ddl: string }>(
        `SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', $1::text) AS ddl`,
        [dbName],
      );
      await admin.query(rev.rows[0]!.ddl);
      const grant = await admin.query<{ ddl: string }>(
        `SELECT format('GRANT CONNECT ON DATABASE %I TO %I', $1::text, $2::text) AS ddl`,
        [dbName, roleName],
      );
      await admin.query(grant.rows[0]!.ddl);
    }

    await control
      .update(tenants)
      .set({ dbName, dbRole: roleName, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId));

    await control
      .insert(tenantDbSecrets)
      .values({
        tenantId,
        passwordEnc: encryptDbPassword(env.APP_SECRET, password),
        host: "127.0.0.1",
        port: 5432,
      })
      .onConflictDoUpdate({
        target: tenantDbSecrets.tenantId,
        set: {
          passwordEnc: encryptDbPassword(env.APP_SECRET, password),
          updatedAt: new Date(),
        },
      });

    // 2. Migrations tenant
    await setStep(tenantId, "migrate");
    await applyTenantMigrations(dbName);

    // Droits applicatifs minimaux + audit append-only
    const { default: pg } = await import("pg");
    const tenantAdminUrl = env.DATABASE_ADMIN_URL.replace(/\/[^/]+$/, `/${dbName}`);
    const grantPool = new pg.Pool({ connectionString: tenantAdminUrl, max: 1 });
    try {
      const grants = await grantPool.query<{ ddl: string }>(
        `SELECT format(
          'GRANT USAGE ON SCHEMA public TO %I;
           GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I;
           GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I;
           REVOKE UPDATE, DELETE ON TABLE audit_event FROM %I;
           GRANT SELECT, INSERT ON TABLE audit_event TO %I;',
          $1::text, $1::text, $1::text, $1::text, $1::text
        ) AS ddl`,
        [roleName],
      );
      await grantPool.query(grants.rows[0]!.ddl);
    } finally {
      await grantPool.end();
    }

    // 3. DEK
    await setStep(tenantId, "dek");
    const dek = generateDek();
    const wrapped = await getKeyManager().wrapDek(dek);
    await control
      .insert(tenantDeks)
      .values({
        tenantId,
        wrappedDek: wrapped.ciphertext,
        kekVersion: wrapped.kekVersion,
        algorithm: wrapped.algorithm,
      })
      .onConflictDoUpdate({
        target: tenantDeks.tenantId,
        set: {
          wrappedDek: wrapped.ciphertext,
          kekVersion: wrapped.kekVersion,
          rotatedAt: new Date(),
        },
      });

    // 4. Membre admin médecin — `users.id` = id Better Auth quand fourni
    await setStep(tenantId, "admin_member");
    const adminEmail = payload.adminUser?.email ?? `admin@${tenant.slug}.local`;
    const adminName = payload.adminUser?.name ?? `Admin ${tenant.name}`;
    const preferredId = payload.adminUser?.userId;
    let [user] = await control.select().from(users).where(eq(users.email, adminEmail)).limit(1);
    if (!user) {
      const userId = preferredId ?? uuidv7();
      await control.insert(users).values({
        id: userId,
        email: adminEmail,
        name: adminName,
      });
      user = {
        id: userId,
        email: adminEmail,
        name: adminName,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } else if (preferredId && user.id !== preferredId) {
      // Remapper vers l'id auth (session) si un compte métier a été créé trop tôt
      await control
        .insert(users)
        .values({ id: preferredId, email: adminEmail, name: adminName })
        .onConflictDoUpdate({
          target: users.id,
          set: { email: adminEmail, name: adminName, updatedAt: new Date() },
        });
      await control
        .update(members)
        .set({ userId: preferredId, updatedAt: new Date() })
        .where(eq(members.userId, user.id));
      await control.delete(users).where(eq(users.id, user.id));
      user = { ...user, id: preferredId };
    }
    const existingMember = await control
      .select()
      .from(members)
      .where(eq(members.tenantId, tenantId))
      .limit(1);
    if (existingMember.length === 0) {
      await control.insert(members).values({
        id: uuidv7(),
        userId: user.id,
        tenantId,
        role: "MEDECIN",
        isTenantAdmin: true,
        status: "active",
      });
    } else if (existingMember[0]!.userId !== user.id) {
      await control
        .update(members)
        .set({ userId: user.id, updatedAt: new Date() })
        .where(eq(members.id, existingMember[0]!.id));
    }

    // 5. Actif / essai + abonnement Solo trialing + rappels
    const finalStatus = tenant.trialEndsAt ? "trial" : "active";
    await control
      .update(tenants)
      .set({
        status: finalStatus,
        provisionStep: "done",
        provisionError: null,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    const { ensureSubscription } = await import("@/server/billing/repository");
    await ensureSubscription(tenantId);

    try {
      const { enqueueTrialReminders } = await import("@/server/jobs/trial-reminders");
      await enqueueTrialReminders(tenantId);
    } catch (remindErr) {
      logger.warn(
        {
          tenantId,
          event: "tenant.trial_reminders_enqueue_fail",
          err: remindErr instanceof Error ? remindErr.message : "x",
        },
        "Enqueue rappels essai échoué (non bloquant — rattrapage via scan)",
      );
    }

    if (tenant.demoDataEnabled) {
      try {
        const { seedSyntheticPatients } = await import("@/db/seed/seed-tenant-demo");
        await seedSyntheticPatients(tenantId);
      } catch (seedErr) {
        logger.warn(
          {
            tenantId,
            event: "tenant.demo_seed_fail",
            err: seedErr instanceof Error ? seedErr.message : "x",
          },
          "Seed démo synthétique échoué (non bloquant)",
        );
      }
    }

    logger.info({ tenantId, dbName, event: "tenant.provision.ok" }, "Tenant provisionné");
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur inconnue";
    logger.error({ tenantId, err: message, event: "tenant.provision.fail" }, "Provisioning échoué");
    await setStep(tenantId, "failed", message);
    throw err;
  } finally {
    await admin.end();
  }
}
