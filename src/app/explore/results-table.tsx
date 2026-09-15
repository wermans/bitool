"use client";

import { useState } from "react";
import type { CubeQuery, CubeRow } from "@/lib/cube-types";

/**
 * Aba Results — mostra os dados crus da query, independente do que a seção
 * Visualization está exibindo (por isso não recebe `validationError`: aqui
 * o dado aparece mesmo que o chartType escolhido não combine com os campos).
 */
export function ResultsTable({
  data,
  loading,
  error,
  query,
  rowLimit,
  showTotals,
}: {
  data: CubeRow[];
  loading: boolean;
  error: string | null;
  query: CubeQuery | null;
  rowLimit: number;
  showTotals: boolean;
}) {
  const [bannerDismissed, setBannerDismissed] = useState(false);

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

  if (!query || data.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Sem dados para esta query.
      </div>
    );
  }

  const dimensionCols = [
    ...query.dimensions,
    ...(query.timeDimensions?.map((t) => t.dimension) ?? []),
  ];
  const measureCols = query.measures;
  const columns = [...dimensionCols, ...measureCols];
  const limitReached = data.length >= rowLimit;

  const totals: Record<string, number> = {};
  if (showTotals) {
    for (const col of measureCols) {
      totals[col] = data.reduce((sum, row) => {
        const v = row[col];
        return sum + (typeof v === "number" ? v : Number(v) || 0);
      }, 0);
    }
  }

  return (
    <div className="space-y-2">
      {limitReached && !bannerDismissed && (
        <div className="flex items-center justify-between rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800">
          <span>Limite de linhas atingido. Resultados podem estar incompletos.</span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="ml-2 text-amber-700 hover:text-amber-900"
            aria-label="Dispensar aviso"
          >
            ✕
          </button>
        </div>
      )}

      <div className="max-h-[420px] overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted text-left">
            <tr>
              <th className="w-10 px-2 py-1.5 text-right text-xs text-muted-foreground">#</th>
              {columns.map((c) => (
                <th
                  key={c}
                  className={`px-2 py-1.5 font-medium ${
                    dimensionCols.includes(c) ? "text-blue-900" : "text-amber-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{c}</span>
                    <span
                      title="Ordenar (em breve)"
                      className="cursor-default text-[10px] text-muted-foreground/60"
                    >
                      ⇅
                    </span>
                    <span
                      title="Opções da coluna (em breve)"
                      className="cursor-default text-[10px] text-muted-foreground/60"
                    >
                      ⚙
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/40">
                <td className="px-2 py-1 text-right text-xs text-muted-foreground">{i + 1}</td>
                {columns.map((c) => (
                  <td key={c} className="px-2 py-1">
                    {row[c] === null || row[c] === undefined ? (
                      <span className="text-muted-foreground">∅</span>
                    ) : (
                      String(row[c])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {showTotals && (
            <tfoot className="sticky bottom-0 border-t-2 border-border bg-muted font-medium">
              <tr>
                <td className="px-2 py-1.5" />
                {dimensionCols.map((c) => (
                  <td key={c} className="px-2 py-1.5 text-xs text-muted-foreground">
                    {c === dimensionCols[0] ? "Total" : ""}
                  </td>
                ))}
                {measureCols.map((c) => (
                  <td key={c} className="px-2 py-1.5">
                    {totals[c].toLocaleString("pt-BR")}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
