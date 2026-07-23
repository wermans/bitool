import { CronExpressionParser } from "cron-parser";
import type { Alert, AlertOperator } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { loadUserAuthPayload } from "@/lib/auth-user";
import { getCubeApiForUser } from "@/lib/cube-client";
import { sendMail } from "@/lib/mailer";
import type { CubeQuery } from "@/lib/cube-types";

function isDue(frequencyCron: string, lastCheckedAt: Date | null, now: Date): boolean {
  try {
    const interval = CronExpressionParser.parse(frequencyCron, {
      currentDate: lastCheckedAt ?? new Date(0),
    });
    return interval.next().toDate() <= now;
  } catch {
    return false; // cron inválido não deve derrubar o worker inteiro
  }
}

function evaluate(operator: AlertOperator, value: number, threshold: number): boolean {
  switch (operator) {
    case "GREATER_THAN":
      return value > threshold;
    case "LESS_THAN":
      return value < threshold;
    case "EQUALS":
      return value === threshold;
    case "NOT_EQUALS":
      return value !== threshold;
  }
}

/**
 * Roda todos os Alerts habilitados que estão "vencidos" segundo seu próprio
 * frequencyCron (cada Alert tem sua própria cadência — não é um intervalo
 * global fixo). Chamado pelo scheduler in-process (ver instrumentation.ts)
 * e, manualmente, por /api/cron/alerts.
 */
export async function runAlertChecks(): Promise<{ checked: number; triggered: number }> {
  const now = new Date();
  const alerts = await prisma.alert.findMany({
    where: { isEnabled: true },
    include: { savedChart: true },
  });

  let checked = 0;
  let triggered = 0;

  for (const alert of alerts) {
    if (!isDue(alert.frequencyCron, alert.lastCheckedAt, now)) continue;
    checked += 1;
    const didTrigger = await checkAlert(alert, now);
    if (didTrigger) triggered += 1;
  }

  return { checked, triggered };
}

async function checkAlert(
  alert: Alert & { savedChart: { cubeQuery: unknown } },
  now: Date
): Promise<boolean> {
  try {
    const payload = await loadUserAuthPayload(alert.createdById);
    const cubeApi = getCubeApiForUser(
      alert.createdById,
      payload?.userAttributes ?? {},
      payload?.isSuperAdmin ?? false
    );

    const query = alert.savedChart.cubeQuery as CubeQuery;
    // CubeQuery é um contrato interno propositalmente mais solto que o tipo
    // exaustivo do @cubejs-client/core (mesmo padrão do proxy em
    // /api/cube/query) — o Cube.js valida a query de verdade em runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultSet = await cubeApi.load(query as any);
    const rows = resultSet.rawData();
    const measure = query.measures[0];
    const value = rows.length > 0 && measure ? Number(rows[0][measure] ?? 0) : 0;

    const isTriggered = evaluate(alert.operator, value, alert.threshold);
    const previousStatus = alert.lastStatus;

    await prisma.alert.update({
      where: { id: alert.id },
      data: {
        lastStatus: isTriggered ? "TRIGGERED" : "OK",
        lastCheckedAt: now,
        lastTriggeredAt: isTriggered ? now : alert.lastTriggeredAt,
      },
    });

    if (isTriggered) {
      // Só reenvia e-mail na transição para TRIGGERED — evita spam a cada
      // tick enquanto a condição permanece verdadeira.
      const notifiedTo = previousStatus !== "TRIGGERED" ? await notify(alert, value) : [];

      await prisma.alertHistory.create({
        data: {
          alertId: alert.id,
          status: "TRIGGERED",
          value,
          message: buildMessage(alert, value),
          notifiedTo,
          triggeredAt: now,
        },
      });
    }

    return isTriggered;
  } catch (err) {
    await prisma.alert.update({
      where: { id: alert.id },
      data: { lastStatus: "ERROR", lastCheckedAt: now },
    });
    await prisma.alertHistory.create({
      data: {
        alertId: alert.id,
        status: "ERROR",
        value: 0,
        message: err instanceof Error ? err.message : "Erro desconhecido ao avaliar o alerta",
        notifiedTo: [],
        triggeredAt: now,
      },
    });
    return false;
  }
}

function buildMessage(alert: Alert, value: number): string {
  const op: Record<AlertOperator, string> = {
    GREATER_THAN: ">",
    LESS_THAN: "<",
    EQUALS: "=",
    NOT_EQUALS: "!=",
  };
  return `${alert.name}: valor atual ${value} (condição: ${op[alert.operator]} ${alert.threshold})`;
}

async function notify(alert: Alert, value: number): Promise<string[]> {
  if (alert.recipients.length === 0) return [];
  await sendMail({
    to: alert.recipients,
    subject: `[BiTool] Alerta disparado: ${alert.name}`,
    text: buildMessage(alert, value),
  });
  return alert.recipients;
}
