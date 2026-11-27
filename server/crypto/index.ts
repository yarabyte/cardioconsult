import { env } from "@/env";
import { LocalDevKeyManager } from "./local-dev-key-manager";
import { KmsKeyManager } from "./kms-key-manager";
import type { KeyManager } from "./types";

export * from "./types";
export * from "./envelope";
export * from "./blind-index";
export * from "./db-password";
export { LocalDevKeyManager } from "./local-dev-key-manager";
export { KmsKeyManager } from "./kms-key-manager";

let singleton: KeyManager | null = null;

export function getKeyManager(): KeyManager {
  if (singleton) return singleton;
  const mode =
    env.CRYPTO_KEY_MANAGER ?? (env.NEXT_PUBLIC_APP_ENV === "production" ? "kms" : "local-dev");
  singleton = mode === "kms" ? new KmsKeyManager() : new LocalDevKeyManager(env.APP_SECRET);
  return singleton;
}
