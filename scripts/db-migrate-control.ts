import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL requis");
  const pool = new pg.Pool({ connectionString: url });
  const files = [
    "0000_init.sql",
    "0001_better_auth.sql",
    "0002_inscription.sql",
    "0003_equipe.sql",
    "0004_billing.sql",
    "0005_support_sessions.sql",
    "0006_rgpd.sql",
    "0007_wave5_persistence.sql",
    "0008_trial_reminders.sql",
  ];
  try {
    for (const file of files) {
      const sqlPath = path.join(process.cwd(), "db/control/migrations", file);
      const sql = await readFile(sqlPath, "utf8");
      await pool.query(sql);

      console.log(`Migration control appliquée (${file}).`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
