import { prisma } from "@/lib/prisma";
import type { UserAttributes } from "@/types/next-auth";

export type UserAuthPayload = {
  id: string;
  email: string;
  name: string | null;
  role: string | null;
  permissions: string[]; // "action:subject", ex: "manage:all" ou "view:Dashboard"
  isSuperAdmin: boolean;
  userAttributes: UserAttributes;
};

/**
 * Carrega role, permissões efetivas e user attributes (usados no RLS do Cube)
 * de um usuário. Chamado no login (credentials/SAML) para montar o JWT —
 * não é chamado a cada request, então uma query mais ampla aqui é aceitável.
 */
export async function loadUserAuthPayload(
  userId: string
): Promise<UserAuthPayload | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
      attributeValues: { include: { userAttribute: true } },
    },
  });

  if (!user || !user.isActive) return null;

  const permissions = (user.role?.permissions ?? []).map(
    (rp) => `${rp.permission.action}:${rp.permission.subject}`
  );

  const userAttributes: UserAttributes = {};
  for (const av of user.attributeValues) {
    userAttributes[av.userAttribute.name] = av.values;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role?.name ?? null,
    permissions,
    isSuperAdmin: user.isSuperAdmin,
    userAttributes,
  };
}
