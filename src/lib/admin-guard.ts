import { getServerSession, type Session } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";

/**
 * Usado no início de toda API route de /admin. Retorna a sessão quando
 * autorizada, ou uma NextResponse de erro pronta para o caller devolver.
 */
export async function requireAdmin(
  action: string,
  subject: string
): Promise<{ session: Session } | { error: NextResponse }> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  }
  if (!hasPermission(session, action, subject)) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }
  return { session };
}
