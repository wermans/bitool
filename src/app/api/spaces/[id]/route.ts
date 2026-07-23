import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewSpace, canEditSpace } from "@/lib/space-access";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1).optional(),
  isPinned: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  if (!(await canViewSpace(session, params.id))) {
    return NextResponse.json({ error: "Sem acesso a este space" }, { status: 403 });
  }

  const space = await prisma.space.findUnique({
    where: { id: params.id },
    include: {
      owner: true,
      dashboards: { orderBy: [{ isPinned: "desc" }, { name: "asc" }] },
      charts: { orderBy: [{ isPinned: "desc" }, { name: "asc" }] },
      groupAccess: { include: { group: true } },
    },
  });
  if (!space) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(space);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const space = await prisma.space.findUnique({ where: { id: params.id } });
  if (!space) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!(await canEditSpace(session, space))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.space.update({
    where: { id: params.id },
    data: {
      ...parsed.data,
      pinnedAt: parsed.data.isPinned ? new Date() : parsed.data.isPinned === false ? null : undefined,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const space = await prisma.space.findUnique({ where: { id: params.id } });
  if (!space) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (!(await canEditSpace(session, space))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  await prisma.space.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
