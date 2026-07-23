import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SetupForm } from "./setup-form";

// Sempre consulta o banco (contagem de usuários) — nunca deve ser
// pré-renderizada estaticamente no build.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">Bem-vindo ao BiTool</h1>
          <p className="text-sm text-muted-foreground">
            Crie a conta de super-administrador para inicializar a plataforma.
          </p>
        </div>
        <SetupForm />
      </div>
    </main>
  );
}
