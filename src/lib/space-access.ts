import type { Session } from "next-auth";
import type { Space } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

/**
 * Regras de visibilidade: PUBLIC é visível a qualquer autenticado; PERSONAL
 * só ao dono; PRIVATE ao dono + membros dos grupos com acesso concedido.
 * Admin (manage:all) sempre vê tudo. Sempre resolvido via query ao vivo —
 * nunca a partir de claims do JWT, que podem ficar desatualizados frente a
 * mudanças de grupo dentro da validade da sessão.
 */
export async function getAccessibleSpaces(session: Session) {
  if (hasPermission(session, "manage", "all")) {
    return prisma.space.findMany({
      include: { project: true, owner: true },
      orderBy: [{ isPinned: "desc" }, { name: "asc" }],
    });
  }

  return prisma.space.findMany({
    where: {
      OR: [
        { type: "PUBLIC" },
        { type: "PERSONAL", ownerId: session.user.id },
        {
          type: "PRIVATE",
          OR: [
            { ownerId: session.user.id },
            {
              groupAccess: {
                some: { group: { members: { some: { userId: session.user.id } } } },
              },
            },
          ],
        },
      ],
    },
    include: { project: true, owner: true },
    orderBy: [{ isPinned: "desc" }, { name: "asc" }],
  });
}

export async function canViewSpace(session: Session, spaceId: string) {
  if (hasPermission(session, "manage", "all")) return true;

  const space = await prisma.space.findUnique({
    where: { id: spaceId },
    include: { groupAccess: { include: { group: { include: { members: true } } } } },
  });
  if (!space) return false;
  if (space.type === "PUBLIC") return true;
  if (space.ownerId === session.user.id) return true;
  if (space.type === "PRIVATE") {
    return space.groupAccess.some((ga) =>
      ga.group.members.some((m) => m.userId === session.user.id)
    );
  }
  return false;
}

/**
 * Edição: dono sempre pode; PRIVATE exige access=EDIT no grupo; PUBLIC exige
 * a permissão update:Space (Editor/Admin).
 */
export async function canEditSpace(session: Session, space: Space) {
  if (hasPermission(session, "manage", "all")) return true;
  if (space.ownerId === session.user.id) return true;

  if (space.type === "PRIVATE") {
    const access = await prisma.groupSpaceAccess.findFirst({
      where: {
        spaceId: space.id,
        access: "EDIT",
        group: { members: { some: { userId: session.user.id } } },
      },
    });
    return Boolean(access);
  }

  if (space.type === "PUBLIC") {
    return hasPermission(session, "update", "Space");
  }

  return false;
}
