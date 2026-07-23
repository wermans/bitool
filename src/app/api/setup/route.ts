import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureDefaultRoles } from "@/lib/seed-roles";
import { ensureDefaultProject } from "@/lib/seed-project";

const setupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

// GET: usado por /setup e pelo middleware/telas para decidir se o wizard de
// bootstrap deve ser exibido (nenhum usuário cadastrado ainda).
export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ needsSetup: count === 0 });
}

// POST: cria o super-admin local (break-glass). Só funciona uma vez —
// depois que existe qualquer usuário, esta rota fica permanentemente fechada.
export async function POST(req: NextRequest) {
  const existing = await prisma.user.count();
  if (existing > 0) {
    return NextResponse.json(
      { error: "A plataforma já foi inicializada." },
      { status: 409 }
    );
  }

  const parsed = setupSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { name, email, password } = parsed.data;

  const { adminRole } = await ensureDefaultRoles();
  await ensureDefaultProject();
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      authMethod: "CREDENTIALS",
      isSuperAdmin: true,
      roleId: adminRole.id,
    },
  });

  return NextResponse.json({ ok: true });
}
