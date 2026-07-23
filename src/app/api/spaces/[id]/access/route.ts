import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditSpace } from "@/lib/space-access";

export const dynamic = "force-dynamic";

const schema = z.object({
  groups: z.array(z.object({ groupId: z.string(), access: z.enum(["VIEW", "EDIT"]) })),
});

// Substitui integralmente o conjunto de grupos com acesso a um Space PRIVATE.
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const space = await prisma.space.findUnique({ where: { id: params.id } });
  if (!space) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  if (space.type !== "PRIVATE") {
    return NextResponse.json(
      { error: "Acesso por grupo só se aplica a spaces privados." },
      { status: 400 }
    );
  }
  if (!(await canEditSpace(session, space))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.groupSpaceAccess.deleteMany({ where: { spaceId: params.id } }),
    prisma.groupSpaceAccess.createMany({
      data: parsed.data.groups.map((g) => ({
        spaceId: params.id,
        groupId: g.groupId,
        access: g.access,
      })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
