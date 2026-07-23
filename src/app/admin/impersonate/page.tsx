import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImpersonateClient } from "./impersonate-client";

export const dynamic = "force-dynamic";

export default async function AdminImpersonatePage() {
  const session = await getServerSession(authOptions);

  const [users, history] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: session?.user.id }, isActive: true },
      include: { role: true },
      orderBy: { email: "asc" },
    }),
    prisma.impersonationEvent.findMany({
      take: 20,
      orderBy: { startedAt: "desc" },
      include: { actor: true, target: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Impersonation</h2>
        <p className="text-sm text-muted-foreground">
          Veja a plataforma como outro usuário para diagnosticar problemas de
          acesso ou RLS. Fica registrado em log de auditoria.
        </p>
      </div>

      <ImpersonateClient
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          roleName: u.role?.name ?? null,
        }))}
      />

      <div>
        <h3 className="mb-2 font-medium">Histórico recente</h3>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-3 py-2">Admin</th>
                <th className="px-3 py-2">Personificou</th>
                <th className="px-3 py-2">Início</th>
                <th className="px-3 py-2">Fim</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-border">
                  <td className="px-3 py-2">{h.actor.email}</td>
                  <td className="px-3 py-2">{h.target.email}</td>
                  <td className="px-3 py-2">
                    {h.startedAt.toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">
                    {h.endedAt ? h.endedAt.toLocaleString("pt-BR") : "em andamento"}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td className="px-3 py-2 text-muted-foreground" colSpan={4}>
                    Nenhuma impersonation registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
