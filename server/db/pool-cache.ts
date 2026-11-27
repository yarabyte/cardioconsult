import pg from "pg";

const { Pool } = pg;

export interface PoolCacheOptions {
  maxPools?: number;
  idleTimeoutMillis?: number;
  maxConnectionsPerPool?: number;
}

interface CacheEntry {
  pool: pg.Pool;
  lastUsed: number;
  tenantId: string;
}

/**
 * Cache LRU borné de pools — un pool n'est jamais réutilisé pour un autre tenant.
 */
export class TenantPoolCache {
  private readonly maxPools: number;
  private readonly idleTimeoutMillis: number;
  private readonly maxConnectionsPerPool: number;
  private readonly entries = new Map<string, CacheEntry>();

  constructor(options: PoolCacheOptions = {}) {
    this.maxPools = options.maxPools ?? 16;
    this.idleTimeoutMillis = options.idleTimeoutMillis ?? 30_000;
    this.maxConnectionsPerPool = options.maxConnectionsPerPool ?? 4;
  }

  getOrCreate(tenantId: string, connectionString: string): pg.Pool {
    const existing = this.entries.get(tenantId);
    if (existing) {
      if (existing.tenantId !== tenantId) {
        throw new Error("Violation d'isolation : pool associé au mauvais tenant.");
      }
      existing.lastUsed = Date.now();
      this.entries.delete(tenantId);
      this.entries.set(tenantId, existing);
      return existing.pool;
    }

    while (this.entries.size >= this.maxPools) {
      const oldestKey = this.entries.keys().next().value;
      if (!oldestKey) break;
      const old = this.entries.get(oldestKey);
      this.entries.delete(oldestKey);
      void old?.pool.end();
    }

    const pool = new Pool({
      connectionString,
      max: this.maxConnectionsPerPool,
      idleTimeoutMillis: this.idleTimeoutMillis,
      allowExitOnIdle: true,
    });
    this.entries.set(tenantId, { pool, lastUsed: Date.now(), tenantId });
    return pool;
  }

  async evict(tenantId: string): Promise<void> {
    const entry = this.entries.get(tenantId);
    if (!entry) return;
    this.entries.delete(tenantId);
    await entry.pool.end();
  }

  async endAll(): Promise<void> {
    const ending = [...this.entries.values()].map((e) => e.pool.end());
    this.entries.clear();
    await Promise.all(ending);
  }

  size(): number {
    return this.entries.size;
  }
}
