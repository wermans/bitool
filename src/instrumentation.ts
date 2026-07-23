export async function register() {
  // A engine de Alertas usa Prisma/node-cron — só roda no runtime Node,
  // nunca no Edge (middleware) nem durante o build.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startAlertScheduler } = await import("@/lib/alerts/scheduler");
    startAlertScheduler();
  }
}
