import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loadUserAuthPayload } from "@/lib/auth-user";

// SAML não é registrado como provider NextAuth "oauth" padrão — o fluxo SP-initiated
// é tratado por rotas próprias (/api/auth/saml/login e /api/auth/callback/saml,
// ver src/lib/samlify.ts) que validam a asserção e então emitem o mesmo cookie de
// sessão JWT que este authOptions usa, mantendo os dois fluxos compatíveis.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user || !user.isActive || !user.passwordHash) return null;

        // Break-glass: mesmo com "disablePasswordLogin" ativo no SsoConfig,
        // o super-admin local sempre pode logar por senha.
        if (!user.isSuperAdmin) {
          const activeSso = await prisma.ssoConfig.findFirst({
            where: { isEnabled: true, disablePasswordLogin: true },
          });
          if (activeSso) return null;
        }

        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // `user` só existe no momento do login (credentials.authorize ou
      // via callback SAML manual) — recarrega o payload completo do banco.
      if (user?.id) {
        const payload = await loadUserAuthPayload(user.id);
        if (payload) {
          token.uid = payload.id;
          token.role = payload.role;
          token.permissions = payload.permissions;
          token.isSuperAdmin = payload.isSuperAdmin;
          token.userAttributes = payload.userAttributes;
          token.email = payload.email;
          token.name = payload.name;
          // Login "de verdade" (credentials/SAML) sempre encerra qualquer
          // impersonation anterior — o fluxo de impersonation reemite o
          // token manualmente (ver /api/admin/impersonate) sem passar por
          // este branch, então não sobrescreve o campo nesse caso.
          token.impersonatedBy = null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
        session.user.permissions = token.permissions ?? [];
        session.user.isSuperAdmin = token.isSuperAdmin ?? false;
        session.user.userAttributes = token.userAttributes ?? {};
        session.user.impersonatedBy = token.impersonatedBy ?? null;
      }
      return session;
    },
  },
};
