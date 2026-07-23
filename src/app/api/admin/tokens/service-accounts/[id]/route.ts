import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const schema = z.object({ isActive: z.boolean() });

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin("update", "ServiceAccount");
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const account = await prisma.serviceAccount.update({
    where: { id: params.id },
    data: parsed.data,
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      expiresAt: true,
      roleId: true,
      createdAt: true,
    },
  });
  return NextResponse.json(account);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin("delete", "ServiceAccount");
  if ("error" in guard) return guard.error;

  await prisma.serviceAccount.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
