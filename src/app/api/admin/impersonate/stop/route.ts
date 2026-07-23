import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadUserAuthPayload } from "@/lib/auth-user";
import { setSessionCookie } from "@/lib/session-token";

export const dynamic = "force-dynamic";

// Não usa requireAdmin: o usuário impersonado pode ter permissões bem
// diferentes do admin original — quem autoriza "voltar" é o próprio fato de
// impersonatedBy estar presente no token, gravado no início da impersonation.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user.impersonatedBy) {
    return NextResponse.json(
      { error: "Nenhuma impersonation em andamento." },
      { status: 400 }
    );
  }

  const actorId = session.user.impersonatedBy.id;

  await prisma.impersonationEvent.updateMany({
    where: { actorId, targetId: session.user.id, endedAt: null },
    data: { endedAt: new Date() },
  });

  const payload = await loadUserAuthPayload(actorId);
  if (!payload) {
    return NextResponse.json(
      { error: "A conta original não está mais ativa." },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, payload, null);
  return res;
}
