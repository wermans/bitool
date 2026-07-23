import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { loadUserAuthPayload } from "@/lib/auth-user";
import { setSessionCookie } from "@/lib/session-token";

export const dynamic = "force-dynamic";

const schema = z.object({ targetUserId: z.string() });

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("update", "User");
  if ("error" in guard) return guard.error;
  const { session } = guard;

  if (session.user.impersonatedBy) {
    return NextResponse.json(
      { error: "Encerre a impersonation atual antes de iniciar outra." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { targetUserId } = parsed.data;

  if (targetUserId === session.user.id) {
    return NextResponse.json(
      { error: "Você já está logado como você mesmo." },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target || !target.isActive) {
    return NextResponse.json(
      { error: "Usuário não encontrado ou inativo." },
      { status: 404 }
    );
  }

  const payload = await loadUserAuthPayload(targetUserId);
  if (!payload) {
    return NextResponse.json({ error: "Usuário inativo." }, { status: 400 });
  }

  await prisma.impersonationEvent.create({
    data: { actorId: session.user.id, targetId: targetUserId },
  });

  const res = NextResponse.json({ ok: true });
  await setSessionCookie(res, payload, {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name ?? null,
  });
  return res;
}
