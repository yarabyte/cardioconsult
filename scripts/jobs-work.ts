import { registerJobHandlers, stopBoss } from "@/server/jobs/boss";
import { logger } from "@/lib/logging/logger";

async function main() {
  await registerJobHandlers();
  logger.info({ event: "jobs.work" }, "Worker pg-boss en écoute (Ctrl+C pour arrêter)");
  const shutdown = async () => {
    await stopBoss();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
