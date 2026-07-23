"use client";

import { useEffect, useState } from "react";
import type { CubeQuery, CubeRow } from "@/lib/cube-types";

export function useCubeQuery(query: CubeQuery | null) {
  const [data, setData] = useState<CubeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryKey = query ? JSON.stringify(query) : null;

  useEffect(() => {
    if (!queryKey) return;
    const controller = new AbortController();

    setLoading(true);
    setError(null);
    fetch("/api/cube/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: JSON.parse(queryKey) }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Erro ao consultar dados");
        setData(body.data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  return { data, loading, error };
}
