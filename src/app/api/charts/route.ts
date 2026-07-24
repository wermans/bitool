import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditSpace, getAccessibleSpaces } from "@/lib/space-access";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  spaceId: z.string(),
  chartType: z.string(),
  cubeQuery: z.record(z.string(), z.unknown()),
  chartConfig: z.record(z.string(), z.unknown()).optional(),
});

// Lista os gráficos salvos visíveis ao usuário (todos os spaces acessíveis)
// — usado pelo seletor de "mesclar com outro gráfico" no Explorer.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const spaces = await getAccessibleSpaces(session);
  const charts = await prisma.savedChart.findMany({
    where: { spaceId: { in: spaces.map((s) => s.id) } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(charts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const space = await prisma.space.findUnique({ where: { id: parsed.data.spaceId } });
  if (!space) return NextResponse.json({ error: "Space não encontrado" }, { status: 404 });
  if (!(await canEditSpace(session, space))) {
    return NextResponse.json({ error: "Sem permissão neste space" }, { status: 403 });
  }

  const chart = await prisma.savedChart.create({
    data: {
      name: parsed.data.name,
      spaceId: parsed.data.spaceId,
      chartType: parsed.data.chartType,
      cubeQuery: parsed.data.cubeQuery as Prisma.InputJsonValue,
      chartConfig: parsed.data.chartConfig as Prisma.InputJsonValue | undefined,
      ownerId: session.user.id,
    },
  });
  return NextResponse.json(chart, { status: 201 });
}
