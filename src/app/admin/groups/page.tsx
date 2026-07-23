import { prisma } from "@/lib/prisma";
import { GroupsClient } from "./groups-client";

export const dynamic = "force-dynamic";

export default async function AdminGroupsPage() {
  const groups = await prisma.group.findMany({
    include: { _count: { select: { members: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Grupos</h2>
        <p className="text-sm text-muted-foreground">
          Usados para conceder acesso a Spaces privados. A associação de
          usuários a grupos é feita no detalhe de cada usuário.
        </p>
      </div>
      <GroupsClient
        initialGroups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          memberCount: g._count.members,
        }))}
      />
    </div>
  );
}
