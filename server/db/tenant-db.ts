import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { env } from "@/env";
import * as schema from "@/db/tenant/schema";
import { tenants, tenantDbSecrets, tenantDeks } from "@/db/control/schema";
import { getControlDb } from "./control-db";
import { TenantPoolCache } from "./pool-cache";
import { getKeyManager } from "@/server/crypto";
import { decryptDbPassword } from "@/server/crypto/db-password";
import {
  runWithTenantCryptoAsync,
  type TenantCryptoStore,
} from "@/server/crypto/tenant-crypto-context";

export type TenantDb = ReturnType<typeof drizzle<typeof schema>>;

const poolCache = new TenantPoolCache({ maxPools: 16 });

async function loadTenantConnection(tenantId: string): Promise<{
  connectionString: string;
  crypto: TenantCryptoStore;
}> {
  const control = getControlDb();
  const [tenant] = await control.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant || !tenant.dbName || !tenant.dbRole) {
    throw new Error("Tenant inconnu ou non provisionné.");
  }
  // Suspendu : lecture seule (DB encore accessible pour continuité des soins + export).
  if (tenant.status === "deleted") {
    throw new Error("Tenant indisponible.");
  }

  const [secret] = await control
    .select()
    .from(tenantDbSecrets)
    .where(eq(tenantDbSecrets.tenantId, tenantId))
    .limit(1);
  if (!secret) throw new Error("Secret DB tenant manquant.");

  const [dekRow] = await control
    .select()
    .from(tenantDeks)
    .where(eq(tenantDeks.tenantId, tenantId))
    .limit(1);
  if (!dekRow) throw new Error("DEK tenant manquante.");

  const keyManager = getKeyManager();
  const dek = await keyManager.unwrapDek({
    ciphertext: dekRow.wrappedDek,
    kekVersion: dekRow.kekVersion,
    algorithm: "aes-256-gcm",
  });
  const blindIndexKey = keyManager.deriveBlindIndexKey(dek);

  const password = decryptDbPassword(env.APP_SECRET, secret.passwordEnc);
  const connectionString = `postgresql://${encodeURIComponent(tenant.dbRole)}:${encodeURIComponent(password)}@${secret.host}:${secret.port}/${tenant.dbName}`;

  return {
    connectionString,
    crypto: { tenantId, dek, keyManager, blindIndexKey },
  };
}

/**
 * Seul point d'accès aux bases tenant.
 * Exécute `fn` dans le contexte crypto du tenant (colonnes encryptedText / blindIndex).
 */
export async function withTenantDb<T>(
  tenantId: string,
  fn: (db: TenantDb) => Promise<T>,
): Promise<T> {
  const { connectionString, crypto } = await loadTenantConnection(tenantId);
  const pool = poolCache.getOrCreate(tenantId, connectionString);
  const db = drizzle(pool, { schema });
  return runWithTenantCryptoAsync(crypto, () => fn(db));
}

/** Obtient un client Drizzle tenant (sans wrapper crypto — préférer withTenantDb). */
export async function getTenantDb(tenantId: string): Promise<TenantDb> {
  const { connectionString } = await loadTenantConnection(tenantId);
  const pool = poolCache.getOrCreate(tenantId, connectionString);
  return drizzle(pool, { schema });
}

export async function closeTenantPools(): Promise<void> {
  await poolCache.endAll();
}

export { poolCache as tenantPoolCache };
