import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CronExpressionParser } from "cron-parser";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import { canViewSpace } from "@/lib/space-access";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  savedChartId: z.string(),
  operator: z.enum(["GREATER_THAN", "LESS_THAN", "EQUALS", "NOT_EQUALS"]),
  threshold: z.number(),
  recipients: z.array(z.string().email()).min(1),
  frequencyCron: z.string().default("*/15 * * * *"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const canSeeAll = hasPermission(session, "view", "Alert");
  const alerts = await prisma.alert.findMany({
    where: canSeeAll ? {} : { createdById: session.user.id },
    include: { savedChart: true, history: { orderBy: { triggeredAt: "desc" }, take: 5 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!hasPermission(session, "create", "Alert")) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    CronExpressionParser.parse(parsed.data.frequencyCron);
  } catch {
    return NextResponse.json(
      { error: "frequencyCron inválido (ex.: '*/15 * * * *')" },
      { status: 400 }
    );
  }

  const chart = await prisma.savedChart.findUnique({
    where: { id: parsed.data.savedChartId },
  });
  if (!chart) return NextResponse.json({ error: "Gráfico não encontrado" }, { status: 404 });
  if (!(await canViewSpace(session, chart.spaceId))) {
    return NextResponse.json({ error: "Sem acesso a este gráfico" }, { status: 403 });
  }
  const query = chart.cubeQuery as { measures?: string[] };
  if (!query.measures || query.measures.length === 0) {
    return NextResponse.json(
      { error: "O gráfico precisa de pelo menos uma measure para virar alerta." },
      { status: 400 }
    );
  }

  const alert = await prisma.alert.create({
    data: { ...parsed.data, createdById: session.user.id },
  });
  return NextResponse.json(alert, { status: 201 });
}
