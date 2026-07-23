import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCubeApiForSession } from "@/lib/cube-client";

export const dynamic = "force-dynamic";

// Catálogo de cubes/measures/dimensions, usado pelo Explorer para montar
// queries ad-hoc. Nenhum dado de linha passa por aqui — só metadados.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const cubeApi = getCubeApiForSession(session);
  const meta = await cubeApi.meta();
  return NextResponse.json({ cubes: meta.cubes });
}
