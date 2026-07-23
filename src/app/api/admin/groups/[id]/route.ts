import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin("delete", "Group");
  if ("error" in guard) return guard.error;

  await prisma.group.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
