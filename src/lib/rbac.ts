import type { Session } from "next-auth";

/**
 * Verifica se a sessão tem permissão para `action` sobre `subject`.
 * `isSuperAdmin` e a permissão coringa "manage:all" sempre concedem acesso —
 * usados pela role Admin criada no bootstrap (/setup).
 */
export function hasPermission(
  session: Session | null,
  action: string,
  subject: string
): boolean {
  if (!session?.user) return false;
  if (session.user.isSuperAdmin) return true;

  const perms = session.user.permissions ?? [];
  return (
    perms.includes("manage:all") ||
    perms.includes(`manage:${subject}`) ||
    perms.includes(`${action}:${subject}`)
  );
}

export function requirePermission(
  session: Session | null,
  action: string,
  subject: string
): void {
  if (!hasPermission(session, action, subject)) {
    throw new Error(`Forbidden: missing ${action}:${subject}`);
  }
}
