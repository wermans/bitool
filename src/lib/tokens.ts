import { randomBytes, createHash } from "crypto";

/**
 * PATs/Service Accounts: o valor bruto só existe no momento da criação
 * (devolvido uma única vez na resposta da API). Armazenamos apenas o hash
 * sha256 — suficiente aqui pois o token já tem entropia alta (256 bits) e
 * precisa ser verificado por comparação rápida a cada chamada de API,
 * diferente de senhas de usuário (bcrypt, ver src/lib/auth.ts).
 */
export function generateToken(prefix: "pat" | "svc"): {
  raw: string;
  hash: string;
} {
  const raw = `${prefix}_${randomBytes(24).toString("base64url")}`;
  return { raw, hash: hashToken(raw) };
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
