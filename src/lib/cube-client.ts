import cubejs, { CubeApi } from "@cubejs-client/core";
import type { Session } from "next-auth";
import { signCubeSecurityContext, signCubeSecurityContextForUser } from "@/lib/cube-auth";
import type { UserAttributes } from "@/types/next-auth";

function apiUrl(): string {
  const url = process.env.CUBEJS_API_URL;
  if (!url) throw new Error("CUBEJS_API_URL não configurado");
  return url;
}

/**
 * Cliente server-side do Cube.js. Todo o caching/pré-agregação acontece no
 * Cube (Cube Store/Redis) — este helper só assina o contexto de segurança e
 * repassa a query, sem qualquer camada de cache adicional no Next.js.
 */
export function getCubeApiForSession(session: Session): CubeApi {
  return cubejs(signCubeSecurityContext(session), { apiUrl: apiUrl() });
}

/**
 * Mesma coisa, para código que roda fora de uma request HTTP (worker de
 * Alertas) e por isso não tem uma Session do NextAuth à mão.
 */
export function getCubeApiForUser(
  userId: string,
  userAttributes: UserAttributes,
  isSuperAdmin: boolean
): CubeApi {
  return cubejs(signCubeSecurityContextForUser(userId, userAttributes, isSuperAdmin), {
    apiUrl: apiUrl(),
  });
}
