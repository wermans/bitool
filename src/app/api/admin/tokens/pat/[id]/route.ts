import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const token = await prisma.personalAccessToken.findUnique({
    where: { id: params.id },
  });
  if (!token || token.userId !== session.user.id) {
    return NextResponse.json({ error: "Token não encontrado" }, { status: 404 });
  }

  await prisma.personalAccessToken.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
