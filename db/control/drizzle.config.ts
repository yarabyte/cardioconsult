import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/control/schema.ts",
  out: "./db/control/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://cardioconsult:cardioconsult@127.0.0.1:5432/cc_control",
  },
});
