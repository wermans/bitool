import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadUserAuthPayload } from "@/lib/auth-user";
import { setSessionCookie } from "@/lib/session-token";
import {
  getActiveSsoConfig,
  buildServiceProvider,
  buildIdentityProvider,
  getAppUrl,
  type SamlAttributeMapping,
} from "@/lib/samlify";

// Assertion Consumer Service (ACS). NÃO faz parte do catch-all do NextAuth
// ([...nextauth]) — é uma rota explícita, mais específica, então o Next.js a
// prioriza para exatamente este path, mantendo o contrato exigido:
// http://localhost:8080/api/auth/callback/saml
export async function POST(req: NextRequest) {
  const appUrl = getAppUrl();
  const config = await getActiveSsoConfig();
  if (!config) {
    return NextResponse.redirect(`${appUrl}/login?error=SsoNotConfigured`);
  }

  const formData = await req.formData();
  const body = Object.fromEntries(formData.entries()) as Record<
    string,
    string
  >;

  const sp = buildServiceProvider();
  const idp = buildIdentityProvider(config);

  let email: string | undefined;
  let name: string | undefined;

  try {
    const { extract } = await sp.parseLoginResponse(idp, "post", { body });
    const mapping = (config.attributeMapping as SamlAttributeMapping) ?? {};
    const attributes = (extract.attributes ?? {}) as Record<string, string>;

    email = attributes[mapping.email ?? "email"] ?? extract.nameID;
    name = attributes[mapping.name ?? "name"];
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=SamlValidationFailed`);
  }

  if (!email) {
    return NextResponse.redirect(`${appUrl}/login?error=MissingEmailAttribute`);
  }
  email = email.toLowerCase();

  if (config.allowedDomains.length > 0) {
    const domain = email.split("@")[1];
    if (!domain || !config.allowedDomains.includes(domain)) {
      return NextResponse.redirect(`${appUrl}/login?error=DomainNotAllowed`);
    }
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const viewerRole = await prisma.role.findUnique({
      where: { name: "Viewer" },
    });
    user = await prisma.user.create({
      data: {
        email,
        name: name ?? email,
        authMethod: "SAML",
        roleId: viewerRole?.id,
      },
    });
  } else if (user.authMethod !== "SAML") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { authMethod: "SAML" },
    });
  }

  const payload = await loadUserAuthPayload(user.id);
  if (!payload) {
    return NextResponse.redirect(`${appUrl}/login?error=UserDisabled`);
  }

  const res = NextResponse.redirect(`${appUrl}/`);
  await setSessionCookie(res, payload, null);
  return res;
}
