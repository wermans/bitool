"use client";

import ReactECharts from "echarts-for-react";
import { useCubeQuery } from "@/hooks/use-cube-query";
import { toEChartsOption, toKpiValue } from "@/lib/chart-transform";
import type { ChartType, CubeQuery } from "@/lib/cube-types";

export function CubeChart({
  query,
  chartType,
  onPointClick,
  height = 300,
}: {
  query: CubeQuery;
  chartType: ChartType;
  onPointClick?: (dimension: string, value: string) => void;
  height?: number;
}) {
  const { data, loading, error } = useCubeQuery(query);

  if (loading) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        Carregando...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-red-600"
      >
        {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-sm text-muted-foreground"
      >
        Sem dados para esta query.
      </div>
    );
  }

  if (chartType === "kpi") {
    const value = toKpiValue(data, query);
    return (
      <div style={{ height }} className="flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">
          {value !== null ? value.toLocaleString("pt-BR") : "—"}
        </span>
        <span className="text-xs text-muted-foreground">{query.measures[0]}</span>
      </div>
    );
  }

  if (chartType === "table") {
    const columns = [...query.dimensions, ...(query.timeDimensions?.map((t) => t.dimension) ?? []), ...query.measures];
    return (
      <div style={{ maxHeight: height }} className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-2 py-1">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c} className="px-2 py-1">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const dimensionKey = query.timeDimensions?.[0]?.dimension ?? query.dimensions[0];
  const option = toEChartsOption(data, query, chartType);

  return (
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
