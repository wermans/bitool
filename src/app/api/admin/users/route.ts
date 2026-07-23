import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().nullable().optional(),
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
} satisfies Prisma.UserSelect;

export async function GET() {
  const guard = await requireAdmin("view", "User");
  if ("error" in guard) return guard.error;

  const users = await prisma.user.findMany({
    select: publicUserSelect,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("create", "User");
  if ("error" in guard) return guard.error;

  const parsed = createUserSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, password, roleId } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um usuário com este e-mail." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      authMethod: "CREDENTIALS",
      roleId: roleId || null,
    },
    select: publicUserSelect,
  });

  return NextResponse.json(user, { status: 201 });
}
