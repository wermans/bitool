import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditSpace, getAccessibleSpaces } from "@/lib/space-access";

export const dynamic = "force-dynamic";

const schema = z.object({ spaceId: z.string(), name: z.string().min(1) });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const spaces = await getAccessibleSpaces(session);
  const dashboards = await prisma.dashboard.findMany({
    where: { spaceId: { in: spaces.map((s) => s.id) } },
    include: { space: true },
    orderBy: [{ isPinned: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(dashboards);
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

  const dashboard = await prisma.dashboard.create({
    data: { name: parsed.data.name, spaceId: parsed.data.spaceId, ownerId: session.user.id },
  });
  return NextResponse.json(dashboard, { status: 201 });
}
