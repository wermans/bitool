import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSpace, canEditSpace } from "@/lib/space-access";

export const dynamic = "force-dynamic";

const uiFilterSchema = z.object({
  id: z.string(),
  member: z.string(),
  operator: z.string(),
  values: z.array(z.string()),
});

const filterStateSchema = z.object({
  logic: z.enum(["and", "or"]),
  groups: z.array(
    z.object({
      id: z.string(),
      logic: z.enum(["and", "or"]),
      filters: z.array(uiFilterSchema),
    })
  ),
});

const schema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  filters: filterStateSchema.optional(),
  isPinned: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const dashboard = await prisma.dashboard.findUnique({
    where: { id: params.id },
    include: { widgets: { include: { savedChart: true } }, space: true },
  });
  if (!dashboard) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!(await canViewSpace(session, dashboard.spaceId))) {
    return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
  }

  const canEdit = await canEditSpace(session, dashboard.space);
  return NextResponse.json({ ...dashboard, canEdit });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
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

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.dashboard.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      pinnedAt: parsed.data.isPinned ? new Date() : parsed.data.isPinned === false ? null : undefined,
    } as Prisma.DashboardUpdateInput,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
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

  await prisma.dashboard.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
