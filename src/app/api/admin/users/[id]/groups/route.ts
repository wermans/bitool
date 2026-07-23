import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const schema = z.object({ groupIds: z.array(z.string()) });

// Substitui integralmente a lista de grupos do usuário pela enviada.
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin("update", "User");
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.userGroup.deleteMany({ where: { userId: params.id } }),
    prisma.userGroup.createMany({
      data: parsed.data.groupIds.map((groupId) => ({
        userId: params.id,
        groupId,
      })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
