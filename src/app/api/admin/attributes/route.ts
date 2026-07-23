import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const guard = await requireAdmin("create", "UserAttribute");
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.userAttribute.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um atributo com este nome." },
      { status: 409 }
    );
  }

  const attribute = await prisma.userAttribute.create({ data: parsed.data });
  return NextResponse.json(attribute, { status: 201 });
}
