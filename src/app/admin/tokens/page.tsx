import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { TokensClient } from "./tokens-client";

export const dynamic = "force-dynamic";

export default async function AdminTokensPage() {
  const session = await getServerSession(authOptions);
  const canManageServiceAccounts = hasPermission(
    session,
    "view",
    "ServiceAccount"
  );

  const [myTokens, serviceAccounts, roles] = await Promise.all([
    prisma.personalAccessToken.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    canManageServiceAccounts
      ? prisma.serviceAccount.findMany({ orderBy: { createdAt: "desc" } })
      : Promise.resolve([]),
    canManageServiceAccounts
      ? prisma.role.findMany({ orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-xl font-semibold">Tokens</h2>
        <p className="text-sm text-muted-foreground">
          Personal Access Tokens (uso pessoal) e Service Accounts (uso
          programático/integrações).
        </p>
      </div>
      <TokensClient
        myTokens={myTokens.map((t) => ({
          id: t.id,
          name: t.name,
          lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
          expiresAt: t.expiresAt?.toISOString() ?? null,
          createdAt: t.createdAt.toISOString(),
        }))}
        serviceAccounts={serviceAccounts.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          isActive: s.isActive,
          expiresAt: s.expiresAt?.toISOString() ?? null,
          roleId: s.roleId,
          createdAt: s.createdAt.toISOString(),
        }))}
        roles={roles.map((r) => ({ id: r.id, name: r.name }))}
        canManageServiceAccounts={canManageServiceAccounts}
      />
    </div>
  );
}
