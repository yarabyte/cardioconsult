import { AsyncLocalStorage } from "node:async_hooks";
import type { KeyManager } from "./types";

export interface TenantCryptoStore {
  tenantId: string;
  dek: Buffer;
  keyManager: KeyManager;
  blindIndexKey: Buffer;
}

export const tenantCryptoContext = new AsyncLocalStorage<TenantCryptoStore>();

export function getTenantCrypto(): TenantCryptoStore {
  const store = tenantCryptoContext.getStore();
  if (!store) {
    throw new Error("Contexte crypto tenant absent — appeler runWithTenantCrypto.");
  }
  return store;
}

export function runWithTenantCrypto<T>(store: TenantCryptoStore, fn: () => T): T {
  return tenantCryptoContext.run(store, fn);
}

export async function runWithTenantCryptoAsync<T>(
  store: TenantCryptoStore,
  fn: () => Promise<T>,
): Promise<T> {
  return tenantCryptoContext.run(store, fn);
}
