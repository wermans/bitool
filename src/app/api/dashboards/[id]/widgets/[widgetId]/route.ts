import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditSpace } from "@/lib/space-access";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; widgetId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dashboard = await prisma.dashboard.findUnique({
    where: { id: params.id },
    include: { space: true },
  });
  if (!dashboard) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!(await canEditSpace(session, dashboard.space))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.dashboardWidget.delete({ where: { id: params.widgetId } });
  return NextResponse.json({ ok: true });
}
