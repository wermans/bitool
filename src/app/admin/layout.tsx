import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { AdminNav } from "./admin-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  // Gate mínimo para entrar em qualquer tela de /admin. Ações específicas
  // (ex.: editar SsoConfig, gerenciar Service Accounts) checam permissões
  // mais granulares dentro de cada rota/API.
  const canEnter =
    hasPermission(session, "view", "User") ||
    hasPermission(session, "manage", "all");
  if (!canEnter) redirect("/");

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-8 p-6">
      <aside className="w-56 shrink-0">
        <h1 className="mb-4 px-3 text-lg font-bold">Admin</h1>
        <AdminNav />
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
