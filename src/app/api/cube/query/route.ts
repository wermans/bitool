import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCubeApiForSession } from "@/lib/cube-client";

export const dynamic = "force-dynamic";

// Proxy fino para o Cube.js: assina o securityContext (RLS) e repassa a
// query tal como veio do client (Explorer/Dashboards). Nenhum cache é feito
// aqui — toda a performance/caching é responsabilidade do Cube (Cube Store).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.query) {
    return NextResponse.json({ error: "query é obrigatória" }, { status: 400 });
  }

  try {
    const cubeApi = getCubeApiForSession(session);
    const resultSet = await cubeApi.load(body.query);
    return NextResponse.json({ data: resultSet.rawData() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao consultar o Cube.js";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
