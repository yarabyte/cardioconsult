import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "@/env";
import * as schema from "@/db/control/schema";

const { Pool } = pg;

export type ControlDb = ReturnType<typeof createControlDb>;

let pool: pg.Pool | null = null;
let db: ControlDb | null = null;

function createControlDb(p: pg.Pool) {
  return drizzle(p, { schema });
}

/** Seul point d'accès à la base control-plane. */
export function getControlDb(): ControlDb {
  if (db) return db;
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  db = createControlDb(pool);
  return db;
}

export function getControlPool(): pg.Pool {
  getControlDb();
  if (!pool) throw new Error("Pool control non initialisé.");
  return pool;
}

/** Connexion admin (CREATE ROLE / DATABASE) — jamais exposée aux requêtes métier. */
export function createAdminPool(connectionString = env.DATABASE_ADMIN_URL) {
  return new Pool({ connectionString, max: 2 });
}

export async function closeControlDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
