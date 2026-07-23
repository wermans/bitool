import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";
import { generateToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  roleId: z.string().nullable().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET() {
  const guard = await requireAdmin("view", "ServiceAccount");
  if ("error" in guard) return guard.error;

  const accounts = await prisma.serviceAccount.findMany({
    orderBy: { createdAt: "desc" },
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
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("create", "ServiceAccount");
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.serviceAccount.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma service account com este nome." },
      { status: 409 }
    );
  }

  const { raw, hash } = generateToken("svc");
  const account = await prisma.serviceAccount.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      roleId: parsed.data.roleId || null,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      tokenHash: hash,
    },
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

  return NextResponse.json({ ...account, token: raw }, { status: 201 });
}
