"use client";

import ReactECharts from "echarts-for-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCubeQuery } from "@/hooks/use-cube-query";
import { useMergedRows } from "@/hooks/use-merged-rows";
import { toEChartsOption, toKpiValue, validateFieldsForChartType } from "@/lib/chart-transform";
import { applyTableCalculations, TABLE_CALC_IS_PERCENT } from "@/lib/table-calculations";
import type { ChartConfig, ChartType, CubeQuery } from "@/lib/cube-types";

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.16 },
};

function formatKpi(value: number, format: ChartConfig["numberFormat"]): string {
  switch (format) {
    case "currency":
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    case "percent":
      return value.toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 });
    case "compact":
      return value.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
    default:
      return value.toLocaleString("pt-BR");
  }
}

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

  let content: React.ReactNode;
  let stateKey: string;

  if (validationError) {
    stateKey = "validation";
    content = (
      <div
        style={{ height }}
        className="flex items-center justify-center px-4 text-center text-sm text-muted-foreground"
      >
        {validationError}
      </div>
    );
  } else if (loading) {
    stateKey = "loading";
    content = (
      <div style={{ height }} className="flex flex-col justify-center gap-2 px-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-3 animate-pulse rounded bg-muted"
            style={{ width: `${70 - i * 15}%` }}
          />
        ))}
      </div>
    );
  } else if (error) {
    stateKey = "error";
    content = (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-red-600"
      >
        {error}
      </div>
    );
  } else if (data.length === 0) {
    stateKey = "empty";
    content = (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        Sem dados para esta query.
      </div>
    );
  } else if (chartType === "kpi") {
    stateKey = "kpi";
    const value = toKpiValue(data, query);
    content = (
      <div style={{ height }} className="flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">
          {value !== null ? formatKpi(value, config?.numberFormat) : "—"}
        </span>
        <span className="text-xs text-muted-foreground">{query.measures[0]}</span>
      </div>
    );
  } else if (chartType === "table") {
    stateKey = "table";
    const calcs = config?.tableCalculations ?? [];
    const rows = applyTableCalculations(data, calcs);
    const baseColumns = merge
      ? Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
      : [
          ...query.dimensions,
          ...(query.timeDimensions?.map((t) => t.dimension) ?? []),
          ...query.measures,
        ];
    const columns = [...baseColumns, ...calcs.map((c) => c.id)];
    const columnLabel = (c: string) => calcs.find((calc) => calc.id === c)?.label ?? c;
    const formatCell = (c: string, value: unknown) => {
      const calc = calcs.find((calc) => calc.id === c);
      if (calc && TABLE_CALC_IS_PERCENT[calc.fn]) {
        return Number(value ?? 0).toLocaleString("pt-BR", {
          style: "percent",
          maximumFractionDigits: 1,
        });
      }
      return String(value ?? "");
    };
    content = (
      <div style={{ maxHeight: height }} className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-2 py-1">
                  {columnLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c} className="px-2 py-1">
                    {formatCell(c, row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } else {
    stateKey = "chart-" + chartType;
    const dimensionKey = query.timeDimensions?.[0]?.dimension ?? query.dimensions[0];
    const option = toEChartsOption(data, query, chartType, config ?? {});
    content = (
      <ReactECharts
        option={option}
        style={{ height }}
        onEvents={
          onPointClick
            ? {
                click: (params: { name?: string }) => {
                  if (params.name && dimensionKey) onPointClick(dimensionKey, params.name);
                },
              }
            : undefined
        }
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div key={stateKey} {...fade}>
        {content}
      </motion.div>
    </AnimatePresence>
  );
}
