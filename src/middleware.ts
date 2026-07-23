import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

// Roda em Edge runtime — só verifica a assinatura do JWT (sem acesso a
// Prisma/Postgres). A regra "nenhum usuário existe ainda -> /setup" é
// resolvida depois, dentro de /login (server component com acesso ao DB).
export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/spaces/:path*",
    "/dashboards/:path*",
    "/explore/:path*",
    "/alerts/:path*",
  ],
};
