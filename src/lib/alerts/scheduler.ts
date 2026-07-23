import cron from "node-cron";
import { runAlertChecks } from "@/lib/alerts/run-checks";

let started = false;

/**
 * Tick global (a cada minuto) que decide, para cada Alert habilitado, se já
 * é hora de rodar — respeitando o frequencyCron individual de cada um (ver
 * isDue em run-checks.ts). Não é o agendamento por-alerta em si; é o "pulso"
 * que verifica quais alertas estão vencidos a cada rodada.
 */
export function startAlertScheduler() {
  if (started) return; // evita registrar duas vezes em hot-reload do dev
  started = true;

  const pattern = process.env.ALERTS_SCHEDULER_PATTERN ?? "*/1 * * * *";
  cron.schedule(pattern, () => {
    runAlertChecks().catch((err) => {
      console.error("[alerts] erro no worker de alertas", err);
    });
  });

  console.log(`[alerts] scheduler iniciado (tick: ${pattern})`);
}
