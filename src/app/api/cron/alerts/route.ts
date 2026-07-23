import { NextRequest, NextResponse } from "next/server";
import { runAlertChecks } from "@/lib/alerts/run-checks";

export const dynamic = "force-dynamic";

// Gatilho HTTP manual/externo do worker de Alertas — o scheduler in-process
// (src/lib/alerts/scheduler.ts, iniciado via instrumentation.ts) já cobre a
// execução recorrente; esta rota existe para testes e para permitir também
// disparar via cron externo, se preferível a depender do processo do Next.js.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const result = await runAlertChecks();
  return NextResponse.json({ ok: true, ...result });
}
