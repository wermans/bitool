import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserDetailClient } from "./user-detail-client";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [user, groups, attributes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      include: {
        groups: { include: { group: true } },
        attributeValues: { include: { userAttribute: true } },
      },
    }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.userAttribute.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{user.name}</h2>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
      <UserDetailClient
        userId={user.id}
        selectedGroupIds={user.groups.map((g) => g.groupId)}
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        attributes={attributes.map((a) => ({ id: a.id, name: a.name }))}
        attributeValues={Object.fromEntries(
          user.attributeValues.map((av) => [av.userAttributeId, av.values])
        )}
      />
    </div>
  );
}
