import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

// { "<userAttributeId>": ["BR-SP", "BR-RJ"], ... } — atributo sem entrada
// nesse mapa não tem override (usa o defaultValue do UserAttribute, se houver).
const schema = z.record(z.string(), z.array(z.string()));

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

  const entries = Object.entries(parsed.data).filter(([, v]) => v.length > 0);

  await prisma.$transaction([
    prisma.userAttributeValue.deleteMany({ where: { userId: params.id } }),
    ...entries.map(([userAttributeId, values]) =>
      prisma.userAttributeValue.create({
        data: { userId: params.id, userAttributeId, values },
      })
    ),
  ]);

  return NextResponse.json({ ok: true });
}
