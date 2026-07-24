"use client";

import { useEffect, useState } from "react";
import type { CubeQuery, CubeRow, MergeConfig } from "@/lib/cube-types";
import { mergeRows } from "@/lib/merge-results";

/**
 * Busca a query "própria" e a do outro gráfico configurado em `merge`,
 * roda as duas contra o Cube.js separadamente e junta o resultado no
 * client (full outer join pela dimensão escolhida em cada lado) — mesma
 * ideia do "Merged Results" do Looker. Fica ocioso (sem fetch) quando
 * `merge` é undefined.
 */
export function useMergedRows(query: CubeQuery, merge: MergeConfig | undefined) {
  const [data, setData] = useState<CubeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mergeKey = merge ? JSON.stringify(merge) : null;
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (!merge) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const chartRes = await fetch(`/api/charts/${merge.otherChartId}`);
        const chart = await chartRes.json();
        if (chart.error) {
          throw new Error(
            typeof chart.error === "string" ? chart.error : "Gráfico não encontrado"
          );
        }
        const otherQuery = chart.cubeQuery as CubeQuery;

        const [resA, resB] = await Promise.all([
          fetch("/api/cube/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: JSON.parse(queryKey) }),
          }),
          fetch("/api/cube/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: otherQuery }),
          }),
        ]);
        const [bodyA, bodyB] = await Promise.all([resA.json(), resB.json()]);
        if (bodyA.error) throw new Error(bodyA.error);
        if (bodyB.error) throw new Error(bodyB.error);
        if (cancelled) return;

        setData(
          mergeRows(bodyA.data, merge.joinOwnDimension, bodyB.data, merge.joinOtherDimension)
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao mesclar resultados");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeKey, queryKey]);

  return { data, loading, error };
}
