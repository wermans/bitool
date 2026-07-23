import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { getAccessibleSpaces } from "@/lib/space-access";
import { AlertsClient } from "./alerts-client";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const canCreate = hasPermission(session, "create", "Alert");
  const canSeeAll = hasPermission(session, "view", "Alert");

  const [alerts, spaces] = await Promise.all([
    prisma.alert.findMany({
      where: canSeeAll ? {} : { createdById: session.user.id },
      include: {
        savedChart: true,
        history: { orderBy: { triggeredAt: "desc" }, take: 5 },
      },
      orderBy: { createdAt: "desc" },
    }),
    getAccessibleSpaces(session),
  ]);

  const charts = await prisma.savedChart.findMany({
    where: { spaceId: { in: spaces.map((s) => s.id) } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Alertas</h1>
        <p className="text-sm text-muted-foreground">
          Monitoramento de métricas — avaliadas periodicamente contra a
          condição configurada, com notificação por e-mail (Mailhog em dev).
        </p>
      </div>

      <AlertsClient
        canCreate={canCreate}
        initialAlerts={alerts.map((a) => ({
          id: a.id,
          name: a.name,
          operator: a.operator,
          threshold: a.threshold,
          frequencyCron: a.frequencyCron,
          recipients: a.recipients,
          isEnabled: a.isEnabled,
          lastStatus: a.lastStatus,
          lastCheckedAt: a.lastCheckedAt?.toISOString() ?? null,
          lastTriggeredAt: a.lastTriggeredAt?.toISOString() ?? null,
          chartName: a.savedChart.name,
          history: a.history.map((h) => ({
            id: h.id,
            status: h.status,
            value: h.value,
            message: h.message,
            triggeredAt: h.triggeredAt.toISOString(),
          })),
        }))}
        charts={charts.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
