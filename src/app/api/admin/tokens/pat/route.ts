import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  expiresAt: z.string().datetime().optional().nullable(),
});

// PATs são pessoais — qualquer usuário autenticado gerencia os próprios,
// sem exigir permissão administrativa adicional.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const tokens = await prisma.personalAccessToken.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, lastUsedAt: true, expiresAt: true, createdAt: true },
  });
  return NextResponse.json(tokens);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { raw, hash } = generateToken("pat");
  const record = await prisma.personalAccessToken.create({
    data: {
      name: parsed.data.name,
      tokenHash: hash,
      userId: session.user.id,
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
    select: { id: true, name: true, lastUsedAt: true, expiresAt: true, createdAt: true },
  });

  // O valor bruto só existe nesta resposta — não é recuperável depois.
  return NextResponse.json({ ...record, token: raw }, { status: 201 });
}
