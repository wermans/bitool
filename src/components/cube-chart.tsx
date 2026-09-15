"use client";

import { useCubeQuery } from "@/hooks/use-cube-query";
import { useMergedRows } from "@/hooks/use-merged-rows";
import { validateFieldsForChartType } from "@/lib/chart-transform";
import { ChartRenderer } from "@/components/chart-renderer";
import type { ChartConfig, ChartType, CubeQuery } from "@/lib/cube-types";

/**
 * Wrapper fino: busca os dados (auto-run — a cada mudança de `query`) e
 * delega a renderização pro `ChartRenderer`. Usado por Dashboards (mantém
 * o comportamento de sempre) e, por ora, também pela seção Visualization
 * do Explorer — a Fase 5 troca o Explorer para um hook de Run manual que
 * alimenta o `ChartRenderer` diretamente, sem passar por aqui.
 */
export function CubeChart({
  query,
  chartType,
  config,
  onPointClick,
  height = 300,
}: {
  query: CubeQuery;
  chartType: ChartType;
  config?: ChartConfig;
  onPointClick?: (dimension: string, value: string) => void;
  height?: number;
}) {
  const merge = config?.merge;
  const validationError = merge
    ? null
    : validateFieldsForChartType(chartType, query.measures, query.dimensions);
  const own = useCubeQuery(merge || validationError ? null : query);
  const merged = useMergedRows(query, merge);
  const { data, loading, error } = merge ? merged : own;

  return (
    <ChartRenderer
      data={data}
      loading={loading}
      error={error}
      validationError={validationError}
      query={query}
      chartType={chartType}
      config={config}
      onPointClick={onPointClick}
      height={height}
      isMerged={Boolean(merge)}
    />
  );
}
