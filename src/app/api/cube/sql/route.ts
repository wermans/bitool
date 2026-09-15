import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCubeApiForSession } from "@/lib/cube-client";

export const dynamic = "force-dynamic";

// Devolve o SQL que o Cube.js geraria pra essa query — chamada separada do
// /load (cubeApi.sql() nunca executa a query, só compila). Alimenta a aba
// SQL da seção Data, sem custo de rodar a consulta de verdade.
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
    const sqlQuery = await cubeApi.sql(body.query);
    return NextResponse.json({ sql: sqlQuery.sql() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao gerar SQL";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
