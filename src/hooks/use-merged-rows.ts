"use client";

import { useEffect, useState } from "react";
import type { CubeQuery, CubeRow, MergeConfig } from "@/lib/cube-types";
import { mergeRows } from "@/lib/merge-results";

/**
 * Busca a query própria + a do outro gráfico configurado em `merge`, roda as
 * duas contra o Cube.js e junta o resultado no client (full outer join pela
 * dimensão escolhida em cada lado) — mesma ideia do "Merged Results" do
 * Looker. Extraída à parte (não só como efeito do hook) porque o Explorer
 * (Fase 5, Run manual) precisa disparar essa busca sob demanda a partir de
 * um clique em Run, não automaticamente a cada mudança de query.
 */
export async function fetchMergedRows(
  query: CubeQuery,
  merge: MergeConfig,
  signal?: AbortSignal
): Promise<CubeRow[]> {
  const chartRes = await fetch(`/api/charts/${merge.otherChartId}`, { signal });
  const chart = await chartRes.json();
  if (chart.error) {
    throw new Error(typeof chart.error === "string" ? chart.error : "Gráfico não encontrado");
  }
  const otherQuery = chart.cubeQuery as CubeQuery;

  const [resA, resB] = await Promise.all([
    fetch("/api/cube/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal,
    }),
    fetch("/api/cube/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: otherQuery }),
      signal,
    }),
  ]);
  const [bodyA, bodyB] = await Promise.all([resA.json(), resB.json()]);
  if (bodyA.error) throw new Error(bodyA.error);
  if (bodyB.error) throw new Error(bodyB.error);

  return mergeRows(bodyA.data, merge.joinOwnDimension, bodyB.data, merge.joinOtherDimension);
}

/**
 * Versão "auto-run" de `fetchMergedRows` — busca de novo a cada mudança de
 * `query`/`merge`. Usada pelo `CubeChart` (Dashboards, sempre auto-run).
 */
export function useMergedRows(query: CubeQuery | null, merge: MergeConfig | undefined) {
  const [data, setData] = useState<CubeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergeKey = merge ? JSON.stringify(merge) : null;
  const queryKey = query ? JSON.stringify(query) : null;

  useEffect(() => {
    if (!merge || !queryKey) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMergedRows(JSON.parse(queryKey), merge)
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao mesclar resultados");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeKey, queryKey]);

  return { data, loading, error };
}
