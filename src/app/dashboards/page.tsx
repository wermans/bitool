import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleSpaces } from "@/lib/space-access";

export const dynamic = "force-dynamic";

export default async function DashboardsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const spaces = await getAccessibleSpaces(session);
  const dashboards = await prisma.dashboard.findMany({
    where: { spaceId: { in: spaces.map((s) => s.id) } },
    include: { space: true },
    orderBy: [{ isPinned: "desc" }, { name: "asc" }],
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboards</h1>
        <p className="text-sm text-muted-foreground">
          Todos os dashboards dos spaces a que você tem acesso.
        </p>
      </div>

      {dashboards.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum dashboard ainda. Crie um a partir de um{" "}
          <Link href="/spaces" className="underline">
            space
          </Link>
          .
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {dashboards.map((d) => (
          <Link
            key={d.id}
            href={`/dashboards/${d.id}`}
            className="rounded-md border border-border p-4 hover:bg-muted"
          >
            <div className="font-medium">
              {d.name} {d.isPinned && "📌"}
            </div>
            <p className="text-xs text-muted-foreground">{d.space.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
