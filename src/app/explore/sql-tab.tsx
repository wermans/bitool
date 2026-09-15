"use client";

import { useEffect, useState } from "react";
import type { CubeQuery } from "@/lib/cube-types";

/**
 * Aba SQL — busca sob demanda (só quando esta aba fica ativa), não em toda
 * mudança de query. `resultSet.sql()` do Cube.js nunca executa a consulta,
 * só compila, então isso não tem custo de leitura no banco.
 */
export function SqlTab({ query }: { query: CubeQuery | null }) {
  const [sql, setSql] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const queryKey = query ? JSON.stringify(query) : null;

  useEffect(() => {
    if (!queryKey) {
      setSql(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/cube/sql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: JSON.parse(queryKey) }),
    })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (body.error) {
          setError(typeof body.error === "string" ? body.error : "Erro ao gerar SQL");
          return;
        }
        setSql(body.sql);
      })
      .catch(() => {
        if (!cancelled) setError("Erro ao gerar SQL");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryKey]);

  function copy() {
    if (!sql) return;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!queryKey) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Sem dados para esta query.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2 px-1 py-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-muted"
            style={{ width: `${70 - i * 15}%` }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="py-10 text-center text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="relative">
      <button
        onClick={copy}
        className="absolute right-2 top-2 rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
      >
        {copied ? "Copiado!" : "copiar"}
      </button>
      <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-muted/40 p-3 pr-16 text-xs leading-relaxed">
        {sql}
      </pre>
    </div>
  );
}
