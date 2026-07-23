import { prisma } from "@/lib/prisma";
import { RolesClient } from "./roles-client";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: [{ subject: "asc" }, { action: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Roles</h2>
        <p className="text-sm text-muted-foreground">
          Admin, Editor e Viewer são nativas e não podem ser removidas. Crie
          roles customizadas combinando as permissões abaixo.
        </p>
      </div>
      <RolesClient
        initialRoles={roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          permissionIds: r.permissions.map((rp) => rp.permissionId),
        }))}
        permissions={permissions.map((p) => ({
          id: p.id,
          action: p.action,
          subject: p.subject,
        }))}
      />
    </div>
  );
}
