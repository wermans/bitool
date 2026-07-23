import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const schema = z.object({ permissionIds: z.array(z.string()) });

// Substitui integralmente o conjunto de permissões da role.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin("update", "Role");
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: params.id } }),
    prisma.rolePermission.createMany({
      data: parsed.data.permissionIds.map((permissionId) => ({
        roleId: params.id,
        permissionId,
      })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin("delete", "Role");
  if ("error" in guard) return guard.error;

  const role = await prisma.role.findUnique({ where: { id: params.id } });
  if (!role) {
    return NextResponse.json({ error: "Role não encontrada" }, { status: 404 });
  }
  if (role.isSystem) {
    return NextResponse.json(
      { error: "Roles nativas (Admin/Editor/Viewer) não podem ser removidas." },
      { status: 400 }
    );
  }

  await prisma.role.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
