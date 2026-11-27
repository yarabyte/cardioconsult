import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "server/**/*.test.ts", "env.test.ts"],
    // Les tests d'intégration (Postgres) s'auto-skip si DATABASE_URL injoignable.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
});
