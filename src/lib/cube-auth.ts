import jwt from "jsonwebtoken";
import type { Session } from "next-auth";
import type { UserAttributes } from "@/types/next-auth";

function sign(userId: string, userAttributes: UserAttributes): string {
  const secret = process.env.CUBEJS_API_SECRET;
  if (!secret) throw new Error("CUBEJS_API_SECRET não configurado");

  return jwt.sign({ userId, userAttributes }, secret, { expiresIn: "12h" });
}

/**
 * Assina um token para a API do Cube.js contendo os UserAttributes do usuário
 * autenticado. `cube/cube.js` (queryRewrite) lê `securityContext.userAttributes`
 * para aplicar o RLS dinâmico — nenhuma lógica de filtro de linha vive no Next.js.
 */
export function signCubeSecurityContext(session: Session): string {
  return sign(
    session.user.id,
    session.user.isSuperAdmin ? {} : session.user.userAttributes // admin não recebe restrição de RLS
  );
}

/**
 * Mesma assinatura, mas fora do ciclo de uma request HTTP autenticada — usada
 * pelo worker de Alertas, que executa a query do Cube "como" o usuário dono
 * do alerta (preservando o RLS dele), sem uma Session do NextAuth disponível.
 */
export function signCubeSecurityContextForUser(
  userId: string,
  userAttributes: UserAttributes,
  isSuperAdmin: boolean
): string {
  return sign(userId, isSuperAdmin ? {} : userAttributes);
}
