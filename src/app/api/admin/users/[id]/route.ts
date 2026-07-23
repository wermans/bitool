import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  roleId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// passwordHash nunca deve sair do servidor — select explícito em vez de
// `include` para não vazá-lo acidentalmente nas respostas da API.
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  isSuperAdmin: true,
  authMethod: true,
  roleId: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  groups: { include: { group: true } },
  attributeValues: { include: { userAttribute: true } },
} satisfies Prisma.UserSelect;

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin("view", "User");
  if ("error" in guard) return guard.error;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: publicUserSelect,
  });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdmin("update", "User");
  if ("error" in guard) return guard.error;

  const parsed = updateUserSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }
  // Um super-admin não pode se auto-desativar via UI, para evitar bloqueio
  // acidental do break-glass.
  if (
    target.isSuperAdmin &&
    parsed.data.isActive === false &&
    target.id === guard.session.user.id
  ) {
    return NextResponse.json(
      { error: "Você não pode desativar sua própria conta." },
      { status: 400 }
    );
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: parsed.data,
    select: publicUserSelect,
  });
  return NextResponse.json(user);
}
