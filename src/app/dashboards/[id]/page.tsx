import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSpace, canEditSpace } from "@/lib/space-access";
import { normalizeFilterState } from "@/lib/filter-groups";
import type { ChartConfig } from "@/lib/cube-types";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const dashboard = await prisma.dashboard.findUnique({
    where: { id: params.id },
    include: {
      widgets: { include: { savedChart: true } },
      space: { include: { charts: true } },
    },
  });
  if (!dashboard) notFound();
  if (!(await canViewSpace(session, dashboard.spaceId))) notFound();

  const canEdit = await canEditSpace(session, dashboard.space);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{dashboard.name}</h1>
        <p className="text-sm text-muted-foreground">{dashboard.space.name}</p>
      </div>

      <DashboardClient
        dashboardId={dashboard.id}
        canEdit={canEdit}
        initialFilters={normalizeFilterState(dashboard.filters)}
        widgets={dashboard.widgets.map((w) => ({
          id: w.id,
          title: w.title,
          x: w.x,
          y: w.y,
          w: w.w,
          h: w.h,
          savedChart: w.savedChart
            ? {
                id: w.savedChart.id,
                name: w.savedChart.name,
                chartType: w.savedChart.chartType,
                cubeQuery: w.savedChart.cubeQuery as {
                  measures: string[];
                  dimensions: string[];
                  timeDimensions?: { dimension: string; granularity?: string }[];
                },
                chartConfig: (w.savedChart.chartConfig as ChartConfig) ?? {},
              }
            : null,
        }))}
        availableCharts={dashboard.space.charts.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}
