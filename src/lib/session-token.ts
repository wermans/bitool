import { encode } from "next-auth/jwt";
import type { NextResponse } from "next/server";
import type { UserAuthPayload } from "@/lib/auth-user";
import type { ImpersonatedBy } from "@/types/next-auth";
import { getAppUrl } from "@/lib/env";

/**
 * Emite um cookie de sessão no mesmo formato que o NextAuth usa para o
 * fluxo de Credentials — usado fora do fluxo padrão de signIn (callback
 * SAML e início/fim de impersonation), mantendo getServerSession/useSession
 * funcionando de forma idêntica independente de como a sessão foi criada.
 */
export async function setSessionCookie(
  res: NextResponse,
  payload: UserAuthPayload,
  impersonatedBy: ImpersonatedBy = null
) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET não configurado");

  const token = await encode({
    secret,
    token: {
      uid: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      permissions: payload.permissions,
      isSuperAdmin: payload.isSuperAdmin,
      userAttributes: payload.userAttributes,
      impersonatedBy,
    },
  });

  const isHttps = getAppUrl().startsWith("https");
  const cookieName = isHttps
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  res.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: isHttps,
    maxAge: 30 * 24 * 60 * 60,
  });
}
