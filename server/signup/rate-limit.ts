import { getControlPool } from "@/server/db/control-db";

const MAX_PER_IP = 10;
const MAX_PER_EMAIL = 5;

/**
 * Rate-limit inscription : 10 / IP / 15 min, 5 / e-mail / 15 min.
 */
export async function assertSignupRateLimit(ip: string, email: string): Promise<void> {
  const pool = getControlPool();
  const checks: Array<{ key: string; max: number }> = [
    { key: `ip:${ip}`, max: MAX_PER_IP },
    { key: `email:${email.toLowerCase()}`, max: MAX_PER_EMAIL },
  ];

  for (const { key, max } of checks) {
    await pool.query(
      `
      INSERT INTO signup_rate_limits (key, count, window_start)
      VALUES ($1, 1, NOW())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN signup_rate_limits.window_start < NOW() - INTERVAL '15 minutes' THEN 1
          ELSE signup_rate_limits.count + 1
        END,
        window_start = CASE
          WHEN signup_rate_limits.window_start < NOW() - INTERVAL '15 minutes' THEN NOW()
          ELSE signup_rate_limits.window_start
        END
      `,
      [key],
    );
    const res = await pool.query<{ count: number }>(
      `SELECT count FROM signup_rate_limits WHERE key = $1`,
      [key],
    );
    const count = res.rows[0]?.count ?? 0;
    if (count > max) {
      throw new Error("RATE_LIMIT");
    }
  }
}
