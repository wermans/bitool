import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

const schema = z.object({
  provider: z.enum(["SAML_ENTRA_ID", "SAML_OKTA", "SAML_GENERIC"]),
  entityId: z.string().min(1),
  ssoLoginUrl: z.string().url(),
  ssoLogoutUrl: z.string().url().optional().or(z.literal("")),
  certificate: z.string().min(1),
  metadataUrl: z.string().url().optional().or(z.literal("")),
  attributeMapping: z.object({
    email: z.string().optional(),
    name: z.string().optional(),
  }),
  allowedDomains: z.array(z.string()),
  isEnabled: z.boolean(),
  disablePasswordLogin: z.boolean(),
});

// MVP: uma única configuração de SSO ativa por vez — sempre a primeira
// linha da tabela (ver src/lib/samlify.ts).
export async function GET() {
  const guard = await requireAdmin("view", "SsoConfig");
  if ("error" in guard) return guard.error;

  const config = await prisma.ssoConfig.findFirst({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const guard = await requireAdmin("update", "SsoConfig");
  if ("error" in guard) return guard.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = {
    ...parsed.data,
    ssoLogoutUrl: parsed.data.ssoLogoutUrl || null,
    metadataUrl: parsed.data.metadataUrl || null,
  };

  const existing = await prisma.ssoConfig.findFirst({ orderBy: { createdAt: "asc" } });
  const config = existing
    ? await prisma.ssoConfig.update({ where: { id: existing.id }, data })
    : await prisma.ssoConfig.create({ data });

  return NextResponse.json(config);
}
