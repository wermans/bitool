import { prisma } from "@/lib/prisma";

const SUBJECTS = [
  "Space",
  "Dashboard",
  "SavedChart",
  "Alert",
  "User",
  "Role",
  "Group",
  "SsoConfig",
  "PersonalAccessToken",
  "ServiceAccount",
  "Project",
  "UserAttribute",
] as const;

/**
 * Cria (idempotente) as roles nativas Admin/Editor/Viewer e o catálogo base
 * de Permissions. Chamado a partir de /api/setup no bootstrap inicial —
 * roles com isSystem=true não podem ser removidas via /admin/roles.
 */
export async function ensureDefaultRoles() {
  const permissionRows = await Promise.all(
    SUBJECTS.flatMap((subject) =>
      ["view", "create", "update", "delete"].map((action) =>
        prisma.permission.upsert({
          where: { action_subject: { action, subject } },
          update: {},
          create: { action, subject },
        })
      )
    )
  );

  const managePermission = await prisma.permission.upsert({
    where: { action_subject: { action: "manage", subject: "all" } },
    update: {},
    create: { action: "manage", subject: "all" },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin", description: "Acesso total à plataforma", isSystem: true },
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: { roleId: adminRole.id, permissionId: managePermission.id },
    },
    update: {},
    create: { roleId: adminRole.id, permissionId: managePermission.id },
  });

  const editorRole = await prisma.role.upsert({
    where: { name: "Editor" },
    update: {},
    create: {
      name: "Editor",
      description: "Cria e edita Spaces, Dashboards e Charts",
      isSystem: true,
    },
  });
  const editorSubjects = ["Space", "Dashboard", "SavedChart", "Alert"];
  await Promise.all(
    permissionRows
      .filter((p) => editorSubjects.includes(p.subject))
      .map((p) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: editorRole.id, permissionId: p.id },
          },
          update: {},
          create: { roleId: editorRole.id, permissionId: p.id },
        })
      )
  );

  const viewerRole = await prisma.role.upsert({
    where: { name: "Viewer" },
    update: {},
    create: {
      name: "Viewer",
      description: "Somente visualização de Spaces, Dashboards e Charts",
      isSystem: true,
    },
  });
  const viewerSubjects = ["Space", "Dashboard", "SavedChart"];
  await Promise.all(
    permissionRows
      .filter((p) => p.action === "view" && viewerSubjects.includes(p.subject))
      .map((p) =>
        prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: { roleId: viewerRole.id, permissionId: p.id },
          },
          update: {},
          create: { roleId: viewerRole.id, permissionId: p.id },
        })
      )
  );

  return { adminRole, editorRole, viewerRole };
}
