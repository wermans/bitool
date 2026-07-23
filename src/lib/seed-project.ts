import { prisma } from "@/lib/prisma";

/**
 * Garante que existe ao menos um Project (idempotente). Spaces exigem um
 * projectId — chamado no bootstrap (/api/setup) e, defensivamente, antes de
 * criar um Space, para cobrir bancos que já passaram pelo setup antes deste
 * módulo existir.
 */
export async function ensureDefaultProject() {
  const existing = await prisma.project.findFirst({ where: { isDefault: true } });
  if (existing) return existing;

  return prisma.project.create({
    data: {
      name: "Default",
      description: "Projeto padrão, criado automaticamente no bootstrap.",
      cubeApiUrl: process.env.CUBEJS_API_URL ?? "http://cube:4000/cubejs-api/v1",
      isDefault: true,
    },
  });
}
