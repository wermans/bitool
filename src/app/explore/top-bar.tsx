"use client";

import { useEffect, useState } from "react";

function formatDataAge(lastRunAt: Date | null, now: number): string {
  if (!lastRunAt) return "";
  const diffMs = now - lastRunAt.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora há pouco";
  if (diffMin < 60) return `${diffMin} min atrás`;
  const diffH = Math.floor(diffMin / 60);
  return `${diffH}h atrás`;
}

/**
 * Top bar do Explorer — Fase 5: Run manual de verdade. `running` vira
 * "Stop" (vermelho + spinner); `stale` realça o botão Run e mostra um aviso
 * ao lado ("consulta alterada"). Não temos como saber bytes processados
 * (isso é um conceito de billing do BigQuery/Looker, sem equivalente no
 * par Cube.js+Postgres deste projeto) — por isso o preview de custo vira
 * apenas um aviso textual, e o "cache hit" real vem de
 * `usedPreAggregations` do Cube.js quando a query bate numa pre-aggregation.
 */
export function TopBar({
  rowCount,
  execTimeMs,
  lastRunAt,
  cacheHit,
  stale,
  running,
  canRun,
  onRun,
  onStop,
  actionsMenu,
}: {
  rowCount?: number;
  execTimeMs?: number;
  lastRunAt?: Date | null;
  cacheHit?: boolean | null;
  stale?: boolean;
  running?: boolean;
  canRun?: boolean;
  onRun?: () => void;
  onStop?: () => void;
  actionsMenu?: React.ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!lastRunAt) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [lastRunAt]);

  const meta =
    rowCount !== undefined && execTimeMs !== undefined
      ? `${rowCount.toLocaleString("pt-BR")} linhas · ${(execTimeMs / 1000).toFixed(2)}s`
      : null;
  const age = lastRunAt ? formatDataAge(lastRunAt, now) : null;

  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-4 py-3">
      <h1 className="text-xl font-bold">Explorer</h1>

      <div className="flex items-center gap-4">
        {meta && (
          <span className="text-xs text-muted-foreground">
            {meta}
            {cacheHit !== null && cacheHit !== undefined && (
              <span className="ml-1 text-muted-foreground/70">
                · {cacheHit ? "cache" : "consulta nova"}
              </span>
            )}
          </span>
        )}
        {age && (
          <span title={lastRunAt?.toLocaleString("pt-BR")} className="text-xs text-muted-foreground">
            {age}
          </span>
        )}

        {stale && !running && (
          <span className="text-xs text-amber-700">Consulta alterada — clique em Run</span>
        )}

        {running ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 rounded-md border border-red-600 bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Stop
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={!canRun}
            title={!canRun ? "Selecione dimensões ou measures primeiro" : undefined}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              stale
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            Run
          </button>
        )}

        {actionsMenu}
      </div>
    </div>
  );
}
