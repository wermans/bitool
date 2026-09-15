"use client";

import { CollapsibleSection } from "./collapsible-section";
import { ResultsTable } from "./results-table";
import { SqlTab } from "./sql-tab";
import { TableCalcEditor } from "./table-calc-editor";
import type { ChartConfig, CubeQuery, CubeRow } from "@/lib/cube-types";
import type { TableCalc } from "@/lib/table-calculations";

export type DataTab = "results" | "sql" | "calc";

const TABS: { key: DataTab; label: string }[] = [
  { key: "results", label: "Results" },
  { key: "sql", label: "SQL" },
  { key: "calc", label: "+ Adicionar cálculo" },
];

/**
 * Seção Data — abas Results/SQL/+cálculo, Row Limit e Totais no cabeçalho.
 * Fase 5: a aba Results segue o modelo Run manual (só mostra dados depois
 * do primeiro Run); a aba SQL usa a query AO VIVO (resultSet.sql() nunca
 * executa nada, então não precisa esperar o Run). Fase 6: Combinar
 * resultados e Salvar saíram daqui — agora vivem no menu ⚙ Ações (ver
 * `actions-menu.tsx`), então esta seção só cuida das 3 abas + limites. `tab`
 * e `open` são controlados de fora pra permitir "Obter SQL" no menu forçar
 * a seção aberta na aba certa.
 */
export function DataSection({
  data,
  loading,
  error,
  query,
  executedQuery,
  selectedMeasures,
  chartConfig,
  onChartConfigChange,
  open,
  onOpenChange,
  tab,
  onTabChange,
}: {
  data: CubeRow[];
  loading: boolean;
  error: string | null;
  query: CubeQuery | null;
  executedQuery: CubeQuery | null;
  selectedMeasures: string[];
  chartConfig: ChartConfig;
  onChartConfigChange: (c: ChartConfig) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tab: DataTab;
  onTabChange: (t: DataTab) => void;
}) {
  const rowLimit = chartConfig.rowLimit ?? 500;
  const showTotals = chartConfig.showTotals ?? false;

  return (
    <CollapsibleSection
      title="Data"
      open={open}
      onOpenChange={onOpenChange}
      headerExtra={
        <div className="flex flex-1 items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => onTabChange(t.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  tab === t.key
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-white/80">
            <label className="flex items-center gap-1.5">
              Row Limit
              <input
                type="number"
                min={1}
                max={10000}
                value={rowLimit}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  onChartConfigChange({
                    ...chartConfig,
                    rowLimit: Math.max(1, Number(e.target.value) || 500),
                  })
                }
                className="w-16 rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-white outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={showTotals}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onChartConfigChange({ ...chartConfig, showTotals: e.target.checked })}
              />
              Totais
            </label>
          </div>
        </div>
      }
    >
      {tab === "results" &&
        (!query ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Selecione dimensões ou measures.
          </p>
        ) : !executedQuery ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Pressione Run para explorar os dados.
          </p>
        ) : (
          <ResultsTable
            data={data}
            loading={loading}
            error={error}
            query={executedQuery}
            rowLimit={rowLimit}
            showTotals={showTotals}
          />
        ))}
      {tab === "sql" && <SqlTab query={query} />}
      {tab === "calc" && (
        <TableCalcEditor
          measures={selectedMeasures}
          calcs={chartConfig.tableCalculations ?? []}
          onChange={(tableCalculations: TableCalc[]) =>
            onChartConfigChange({ ...chartConfig, tableCalculations })
          }
        />
      )}
    </CollapsibleSection>
  );
}
