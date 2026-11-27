export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./env");
    const { logger } = await import("./lib/logging/logger");
    logger.info({ event: "app.start" }, "Cardio Soin démarré (environnement validé)");
  }
}
