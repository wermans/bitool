import type { EChartsOption } from "echarts-for-react";
import type { ChartType, CubeQuery, CubeRow } from "@/lib/cube-types";

/**
 * Transforma o rawData() do Cube.js em uma option do ECharts. MVP: uma
 * dimensão no eixo/rótulo + N measures como séries — sem pivot multi-dimensional.
 */
export function toEChartsOption(
  data: CubeRow[],
  query: CubeQuery,
  chartType: ChartType
): EChartsOption {
  const dimensionKey = query.timeDimensions?.[0]?.dimension ?? query.dimensions[0];
  const measures = query.measures;

  const categories = data.map((row) => String(row[dimensionKey] ?? ""));

  if (chartType === "pie") {
    const measure = measures[0];
    return {
      tooltip: { trigger: "item" },
      series: [
        {
          type: "pie",
          radius: "70%",
          data: data.map((row) => ({
            name: String(row[dimensionKey] ?? ""),
            value: Number(row[measure] ?? 0),
          })),
        },
      ],
    };
  }

  return {
    tooltip: { trigger: "axis" },
    legend: measures.length > 1 ? { data: measures } : undefined,
    xAxis: { type: "category", data: categories },
    yAxis: { type: "value" },
    series: measures.map((measure) => ({
      name: measure,
      type: chartType === "line" ? "line" : "bar",
      data: data.map((row) => Number(row[measure] ?? 0)),
    })),
  };
}

export function toKpiValue(data: CubeRow[], query: CubeQuery): number | null {
  const measure = query.measures[0];
  if (!measure || data.length === 0) return null;
  return Number(data[0][measure] ?? 0);
}
