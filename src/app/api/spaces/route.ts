import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessibleSpaces } from "@/lib/space-access";
import { ensureDefaultProject } from "@/lib/seed-project";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["PERSONAL", "PUBLIC", "PRIVATE"]),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const spaces = await getAccessibleSpaces(session);
  return NextResponse.json(spaces);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const project = await ensureDefaultProject();
  const space = await prisma.space.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      projectId: project.id,
      ownerId: session.user.id,
    },
  });
  return NextResponse.json(space, { status: 201 });
}
