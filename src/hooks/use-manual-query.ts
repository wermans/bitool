"use client";

import { useRef, useState } from "react";
import type { CubeQuery, CubeRow, MergeConfig } from "@/lib/cube-types";
import { fetchMergedRows } from "./use-merged-rows";

/**
 * Modelo "Run manual" do Explorer (spec 7.1): mudar campos/filtros/merge
 * deixa a query *stale*, mas só busca de novo quando `run()` é chamado — ao
 * contrário do `useCubeQuery`/`useMergedRows` (auto-run, usados pelos
 * gráficos de Dashboard). `executedQuery` é o snapshot da query realmente
 * rodada da última vez — é isso (não a `query` ao vivo) que Visualization e
 * Data/Results devem renderizar, pra não trocar o dado sem o usuário mandar.
 */
export function useManualQuery(query: CubeQuery | null, merge: MergeConfig | undefined) {
  const [executedQuery, setExecutedQuery] = useState<CubeQuery | null>(null);
  const [executedMergeKey, setExecutedMergeKey] = useState<string | null>(null);
  const [data, setData] = useState<CubeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const [execTimeMs, setExecTimeMs] = useState<number | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const queryKey = query ? JSON.stringify(query) : null;
  const mergeKey = merge ? JSON.stringify(merge) : null;
  const executedQueryKey = executedQuery ? JSON.stringify(executedQuery) : null;
  const stale = Boolean(query) && (queryKey !== executedQueryKey || mergeKey !== executedMergeKey);

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }

  async function run() {
    if (!query) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    const startedAt = performance.now();
    const frozenQuery = query;
    const frozenMerge = merge;

    try {
      let cacheHitResult: boolean | null = null;
      if (frozenMerge) {
        const rows = await fetchMergedRows(frozenQuery, frozenMerge, controller.signal);
        setData(rows);
      } else {
        const res = await fetch("/api/cube/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: frozenQuery }),
          signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Erro ao consultar dados");
        setData(body.data);
        cacheHitResult = Boolean(body.usedPreAggregations);
      }
      setCacheHit(cacheHitResult);
      setExecutedQuery(frozenQuery);
      setExecutedMergeKey(frozenMerge ? JSON.stringify(frozenMerge) : null);
      setExecTimeMs(performance.now() - startedAt);
      setLastRunAt(new Date());
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro ao consultar dados");
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
        abortRef.current = null;
      }
    }
  }

  return {
    data,
    loading,
    error,
    stale,
    executedQuery,
    lastRunAt,
    execTimeMs,
    cacheHit,
    run,
    stop,
  };
}
