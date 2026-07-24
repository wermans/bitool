import type { EChartsOption } from "echarts-for-react";
import type { ChartConfig, ChartType, CubeQuery, CubeRow } from "@/lib/cube-types";
import { CATEGORICAL_PALETTE, SEQUENTIAL_BLUE, CHART_INK } from "@/lib/chart-palette";

function formatNumber(value: number, format: ChartConfig["numberFormat"]): string {
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

/**
 * Requisitos de campos por tipo de gráfico — usado pelo Explorer para
 * avisar o usuário antes de tentar renderizar (ex.: sankey precisa de 2
 * dimensions). Ver skill "dataviz" / pesquisa do Looker Explore.
 */
export function validateFieldsForChartType(
  chartType: ChartType,
  measures: string[],
  dimensions: string[]
): string | null {
  switch (chartType) {
    case "sankey":
      if (dimensions.length < 2) return "Sankey precisa de 2 dimensions (origem e destino).";
      if (measures.length < 1) return "Sankey precisa de 1 measure (intensidade do fluxo).";
      return null;
    case "treemap":
    case "sunburst":
      if (dimensions.length < 1)
        return `${chartType === "treemap" ? "Treemap" : "Sunburst"} precisa de ao menos 1 dimension.`;
      if (measures.length < 1) return "Precisa de 1 measure (define o tamanho).";
      return null;
    case "gauge":
      if (measures.length !== 1 || dimensions.length !== 0)
        return "Gauge precisa de exatamente 1 measure e nenhuma dimension.";
      return null;
    case "streamgraph":
      if (dimensions.length < 1) return "Streamgraph precisa de 1 dimension categórica.";
      if (measures.length < 1) return "Streamgraph precisa de 1 measure.";
      return null;
    case "bullet":
      if (dimensions.length < 1) return "Bullet precisa de 1 dimension (categoria).";
      if (measures.length < 2)
        return "Bullet precisa de 2 measures: a 1ª é o valor atual, a 2ª é a meta.";
      return null;
    case "dependencyWheel":
      if (dimensions.length < 2)
        return "Dependency wheel precisa de 2 dimensions (nós da relação).";
      if (measures.length < 1) return "Dependency wheel precisa de 1 measure (peso do vínculo).";
      return null;
    default:
      return null;
  }
}

/**
 * Transforma o rawData() do Cube.js em uma option do ECharts. MVP: uma
 * dimensão no eixo/rótulo + N measures como séries — sem pivot multi-dimensional.
 */
export function toEChartsOption(
  data: CubeRow[],
  query: CubeQuery,
  chartType: ChartType,
  config: ChartConfig = {}
): EChartsOption {
  const dimensionKey = query.timeDimensions?.[0]?.dimension ?? query.dimensions[0];
  const measures = query.measures;
  const numberFormat = config.numberFormat;

  const tooltipValueFormatter = (value: unknown) =>
    formatNumber(Number(value ?? 0), numberFormat);

  if (chartType === "pie") {
    const measure = measures[0];
    return {
      color: CATEGORICAL_PALETTE,
      tooltip: { trigger: "item", valueFormatter: tooltipValueFormatter },
      legend: config.showLegend === false ? undefined : { bottom: 0, textStyle: { color: CHART_INK.secondary } },
      series: [
        {
          type: "pie",
          radius: "65%",
          center: ["50%", "45%"],
          itemStyle: { borderColor: "#fff", borderWidth: 2 },
          data: data.map((row) => ({
            name: String(row[dimensionKey] ?? ""),
            value: Number(row[measure] ?? 0),
          })),
        },
      ],
    };
  }

  if (chartType === "sankey") return toSankeyOption(data, query);
  if (chartType === "treemap") return toTreemapOption(data, query, "treemap");
  if (chartType === "sunburst") return toTreemapOption(data, query, "sunburst");
  if (chartType === "gauge") return toGaugeOption(data, query, config);
  if (chartType === "streamgraph") return toStreamgraphOption(data, query);
  if (chartType === "bullet") return toBulletOption(data, query, config);
  if (chartType === "dependencyWheel") return toDependencyWheelOption(data, query);

  const categories = data.map((row) => String(row[dimensionKey] ?? ""));

  return {
    color: CATEGORICAL_PALETTE,
    tooltip: { trigger: "axis", valueFormatter: tooltipValueFormatter },
    legend:
      config.showLegend === false || (config.showLegend === undefined && measures.length <= 1)
        ? undefined
        : { data: measures, top: 0, textStyle: { color: CHART_INK.secondary } },
    grid: { left: 48, right: 16, top: measures.length > 1 ? 32 : 16, bottom: 32 },
    xAxis: config.horizontal
      ? { type: "value", axisLabel: { formatter: (v: number) => formatNumber(v, numberFormat) } }
      : { type: "category", data: categories, axisLine: { lineStyle: { color: CHART_INK.baseline } } },
    yAxis: config.horizontal
      ? { type: "category", data: categories, axisLine: { lineStyle: { color: CHART_INK.baseline } } }
      : { type: "value", axisLabel: { formatter: (v: number) => formatNumber(v, numberFormat) } },
    series: measures.map((measure, i) => ({
      name: measure,
      type: chartType === "line" ? "line" : "bar",
      smooth: chartType === "line",
      showSymbol: chartType === "line" && data.length < 40,
      barMaxWidth: 28,
      itemStyle: chartType === "bar" ? { borderRadius: 4, color: CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length] } : undefined,
      data: data.map((row) => Number(row[measure] ?? 0)),
    })),
  };
}

function toSankeyOption(data: CubeRow[], query: CubeQuery): EChartsOption {
  const [sourceDim, targetDim] = query.dimensions;
  const measure = query.measures[0];

  const nodeNames = new Set<string>();
  const links = data.map((row) => {
    const source = String(row[sourceDim] ?? "");
    const target = String(row[targetDim] ?? "");
    nodeNames.add(source);
    nodeNames.add(target);
    return { source, target, value: Number(row[measure] ?? 0) };
  });

  return {
    color: CATEGORICAL_PALETTE,
    tooltip: { trigger: "item" },
    series: [
      {
        type: "sankey",
        data: Array.from(nodeNames).map((name) => ({ name })),
        links,
        emphasis: { focus: "adjacency" },
        lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.35 },
        label: { color: CHART_INK.secondary },
      },
    ],
  };
}

function toTreemapOption(
  data: CubeRow[],
  query: CubeQuery,
  type: "treemap" | "sunburst"
): EChartsOption {
  const [rootDim, childDim] = query.dimensions;
  const measure = query.measures[0];

  type Node = { name: string; value?: number; children?: Node[] };
  const roots = new Map<string, Map<string, number>>();

  for (const row of data) {
    const rootName = String(row[rootDim] ?? "");
    const value = Number(row[measure] ?? 0);
    if (!roots.has(rootName)) roots.set(rootName, new Map());
    const children = roots.get(rootName)!;
    const childName = childDim ? String(row[childDim] ?? "") : rootName;
    children.set(childName, (children.get(childName) ?? 0) + value);
  }

  const treeData: Node[] = Array.from(roots.entries()).map(([name, children]) => {
    if (!childDim) {
      return { name, value: Array.from(children.values())[0] ?? 0 };
    }
    return {
      name,
      children: Array.from(children.entries()).map(([childName, value]) => ({
        name: childName,
        value,
      })),
    };
  });

  return {
    color: CATEGORICAL_PALETTE,
    tooltip: { trigger: "item" },
    series: [
      type === "treemap"
        ? {
            type: "treemap",
            data: treeData,
            roam: false,
            breadcrumb: { show: false },
            label: { color: "#fff" },
            upperLabel: { show: true, height: 24 },
          }
        : {
            type: "sunburst",
            data: treeData,
            radius: [0, "90%"],
            label: { color: CHART_INK.secondary },
          },
    ],
  };
}

function toGaugeOption(data: CubeRow[], query: CubeQuery, config: ChartConfig): EChartsOption {
  const measure = query.measures[0];
  const value = data.length > 0 ? Number(data[0][measure] ?? 0) : 0;
  const max = value > 0 ? Math.ceil((value * 1.4) / 10) * 10 : 100;

  return {
    series: [
      {
        type: "gauge",
        min: 0,
        max,
        progress: { show: true, width: 14, itemStyle: { color: SEQUENTIAL_BLUE[7] } },
        axisLine: { lineStyle: { width: 14, color: [[1, "#e1e0d9"]] } },
        pointer: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        detail: {
          valueAnimation: true,
          formatter: (v: number) => formatNumber(v, config.numberFormat),
          color: CHART_INK.primary,
          fontSize: 28,
          offsetCenter: [0, "0%"],
        },
        title: { show: true, offsetCenter: [0, "70%"], color: CHART_INK.secondary, fontSize: 12 },
        data: [{ value, name: measure }],
      },
    ],
  };
}

function toStreamgraphOption(data: CubeRow[], query: CubeQuery): EChartsOption {
  const timeDim = query.timeDimensions?.[0]?.dimension;
  const categoryDim = query.dimensions[0];
  const measure = query.measures[0];
  if (!timeDim || !categoryDim) return { series: [] };

  const series = data.map((row) => [
    String(row[timeDim] ?? ""),
    Number(row[measure] ?? 0),
    String(row[categoryDim] ?? ""),
  ]);
  const categories = Array.from(new Set(series.map((s) => s[2])));

  return {
    color: CATEGORICAL_PALETTE,
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: categories, textStyle: { color: CHART_INK.secondary } },
    singleAxis: {
      type: "time",
      top: 40,
      bottom: 32,
      axisLine: { lineStyle: { color: CHART_INK.baseline } },
    },
    series: [
      {
        type: "themeRiver",
        data: series,
        emphasis: { itemStyle: { shadowBlur: 20 } },
      },
    ],
  };
}

function toBulletOption(data: CubeRow[], query: CubeQuery, config: ChartConfig): EChartsOption {
  const dimensionKey = query.dimensions[0];
  const [actualMeasure, targetMeasure] = query.measures;
  const categories = data.map((row) => String(row[dimensionKey] ?? ""));
  const actuals = data.map((row) => Number(row[actualMeasure] ?? 0));
  const targets = data.map((row) => Number(row[targetMeasure] ?? 0));
  const numberFormat = config.numberFormat;

  return {
    color: CATEGORICAL_PALETTE,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (v: unknown) => formatNumber(Number(v ?? 0), numberFormat),
    },
    legend: {
      top: 0,
      data: [actualMeasure, `Meta (${targetMeasure})`],
      textStyle: { color: CHART_INK.secondary },
    },
    grid: { left: 120, right: 24, top: 32, bottom: 24 },
    xAxis: {
      type: "value",
      axisLabel: { formatter: (v: number) => formatNumber(v, numberFormat) },
    },
    yAxis: {
      type: "category",
      data: categories,
      axisLine: { lineStyle: { color: CHART_INK.baseline } },
    },
    series: [
      {
        name: actualMeasure,
        type: "bar",
        data: actuals,
        barWidth: 14,
        itemStyle: { color: CATEGORICAL_PALETTE[0], borderRadius: 2 },
        z: 2,
      },
      {
        name: `Meta (${targetMeasure})`,
        type: "scatter",
        symbol: "rect",
        symbolSize: [4, 26],
        itemStyle: { color: CHART_INK.primary },
        data: targets.map((v, i) => [v, i]),
        z: 3,
      },
    ],
  };
}

function toDependencyWheelOption(data: CubeRow[], query: CubeQuery): EChartsOption {
  const [sourceDim, targetDim] = query.dimensions;
  const measure = query.measures[0];

  const nodeNames = new Set<string>();
  const links = data.map((row) => {
    const source = String(row[sourceDim] ?? "");
    const target = String(row[targetDim] ?? "");
    nodeNames.add(source);
    nodeNames.add(target);
    return { source, target, value: Number(row[measure] ?? 0) };
  });

  const values = links.map((l) => l.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const widthFor = (v: number) => (max === min ? 3 : 1 + ((v - min) / (max - min)) * 7);

  return {
    // Aproximação do dependency wheel do Looker: ECharts não tem um chord
    // diagram nativo (arcos com espessura por par), então usamos "graph"
    // em layout circular — comunica a mesma relação/peso, mas as conexões
    // são linhas, não arcos com curvatura própria por par de nós.
    color: CATEGORICAL_PALETTE,
    tooltip: { trigger: "item" },
    series: [
      {
        type: "graph",
        layout: "circular",
        circular: { rotateLabel: true },
        roam: false,
        label: { show: true, color: CHART_INK.secondary, position: "right" },
        edgeSymbol: ["none", "arrow"],
        edgeSymbolSize: 6,
        lineStyle: { color: "source", curveness: 0.25, opacity: 0.5 },
        data: Array.from(nodeNames).map((name) => ({ name, symbolSize: 14 })),
        links: links.map((l) => ({ ...l, lineStyle: { width: widthFor(l.value) } })),
      },
    ],
  };
}

export function toKpiValue(data: CubeRow[], query: CubeQuery): number | null {
  const measure = query.measures[0];
  if (!measure || data.length === 0) return null;
  return Number(data[0][measure] ?? 0);
}
