import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditSpace } from "@/lib/space-access";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  savedChartId: z.string(),
  title: z.string().optional(),
  x: z.number().default(0),
  y: z.number().default(0),
  w: z.number().default(6),
  h: z.number().default(4),
});

const bulkLayoutSchema = z.object({
  layout: z.array(
    z.object({ id: z.string(), x: z.number(), y: z.number(), w: z.number(), h: z.number() })
  ),
});

async function requireDashboardEdit(dashboardId: string, sessionUserCheck: Session | null) {
  if (!sessionUserCheck) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: dashboardId },
    include: { space: true },
  });
  if (!dashboard) return { error: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  if (!(await canEditSpace(sessionUserCheck, dashboard.space))) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }
  return { dashboard };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const guard = await requireDashboardEdit(params.id, session);
  if ("error" in guard) return guard.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const widget = await prisma.dashboardWidget.create({
    data: { dashboardId: params.id, ...parsed.data },
  });
  return NextResponse.json(widget, { status: 201 });
}

// Atualização em lote da posição/tamanho (drag & resize do react-grid-layout).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const guard = await requireDashboardEdit(params.id, session);
  if ("error" in guard) return guard.error;

  const parsed = bulkLayoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.layout.map((item) =>
      prisma.dashboardWidget.update({
        where: { id: item.id },
        data: { x: item.x, y: item.y, w: item.w, h: item.h },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
