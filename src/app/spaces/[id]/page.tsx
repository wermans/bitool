import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSpace, canEditSpace } from "@/lib/space-access";
import { SpaceDetailClient } from "./space-detail-client";

export const dynamic = "force-dynamic";

export default async function SpaceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (!(await canViewSpace(session, params.id))) {
    notFound();
  }

  const space = await prisma.space.findUnique({
    where: { id: params.id },
    include: {
      dashboards: { orderBy: [{ isPinned: "desc" }, { name: "asc" }] },
      charts: { orderBy: [{ isPinned: "desc" }, { name: "asc" }] },
      groupAccess: { include: { group: true } },
    },
  });
  if (!space) notFound();

  const [canEdit, groups] = await Promise.all([
    canEditSpace(session, space),
    space.type === "PRIVATE" ? prisma.group.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">{space.name}</h1>
        <p className="text-sm text-muted-foreground">
          {space.type === "PERSONAL" && "Space pessoal"}
          {space.type === "PUBLIC" && "Space público"}
          {space.type === "PRIVATE" && "Space privado (por grupo)"}
        </p>
      </div>

      <SpaceDetailClient
        spaceId={space.id}
        spaceType={space.type}
        isPinned={space.isPinned}
        canEdit={canEdit}
        dashboards={space.dashboards.map((d) => ({
          id: d.id,
          name: d.name,
          isPinned: d.isPinned,
        }))}
        charts={space.charts.map((c) => ({
          id: c.id,
          name: c.name,
          chartType: c.chartType,
          isPinned: c.isPinned,
        }))}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        currentAccess={space.groupAccess.map((ga) => ({
          groupId: ga.groupId,
          access: ga.access,
        }))}
      />
    </div>
  );
}
