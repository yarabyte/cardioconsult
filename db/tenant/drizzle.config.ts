import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/tenant/schema.ts",
  out: "./db/tenant/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL_TENANT_TEMPLATE ??
      "postgresql://cardioconsult:cardioconsult@127.0.0.1:5432/cc_control",
  },
});
