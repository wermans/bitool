import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const schema = z.object({
  isEnabled: z.boolean().optional(),
  threshold: z.number().optional(),
  recipients: z.array(z.string().email()).optional(),
});

async function canManage(session: Session, alertId: string) {
  if (hasPermission(session, "manage", "all")) return true;
  const alert = await prisma.alert.findUnique({ where: { id: alertId } });
  return alert?.createdById === session.user.id;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await canManage(session, params.id))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const alert = await prisma.alert.update({ where: { id: params.id }, data: parsed.data });
  return NextResponse.json(alert);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!(await canManage(session, params.id))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.alert.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
