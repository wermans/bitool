import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAccessibleSpaces } from "@/lib/space-access";
import { SpacesClient } from "./spaces-client";

export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const spaces = await getAccessibleSpaces(session);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Spaces</h1>
        <p className="text-sm text-muted-foreground">
          Organize dashboards e gráficos em espaços pessoais, públicos ou
          privados por grupo.
        </p>
      </div>
      <SpacesClient
        initialSpaces={spaces.map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          isPinned: s.isPinned,
          ownerName: s.owner.name,
          isOwner: s.ownerId === session.user.id,
        }))}
      />
    </div>
  );
}
