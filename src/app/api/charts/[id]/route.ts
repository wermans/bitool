import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSpace, canEditSpace } from "@/lib/space-access";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).optional(),
  chartType: z.string().optional(),
  cubeQuery: z.record(z.string(), z.unknown()).optional(),
  chartConfig: z.record(z.string(), z.unknown()).optional(),
  isPinned: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const chart = await prisma.savedChart.findUnique({ where: { id: params.id } });
  if (!chart) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!(await canViewSpace(session, chart.spaceId))) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }
  return NextResponse.json(chart);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const chart = await prisma.savedChart.findUnique({
    where: { id: params.id },
    include: { space: true },
  });
  if (!chart) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!(await canEditSpace(session, chart.space))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.savedChart.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      pinnedAt: parsed.data.isPinned ? new Date() : parsed.data.isPinned === false ? null : undefined,
    } as Prisma.SavedChartUpdateInput,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const chart = await prisma.savedChart.findUnique({
    where: { id: params.id },
    include: { space: true },
  });
  if (!chart) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!(await canEditSpace(session, chart.space))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.savedChart.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
