export type CubeFilter = {
  member: string;
  operator: string;
  values: string[];
};

// Filtro lógico aninhado — mesmo formato nativo do Cube.js (and/or podem
// conter tanto filtros simples quanto outros grupos lógicos).
export type CubeLogicalFilter = {
  and?: CubeQueryFilter[];
  or?: CubeQueryFilter[];
};

export type CubeQueryFilter = CubeFilter | CubeLogicalFilter;

export type CubeQuery = {
  measures: string[];
  dimensions: string[];
  timeDimensions?: { dimension: string; granularity?: string; dateRange?: string | string[] }[];
  filters?: CubeQueryFilter[];
  order?: Record<string, "asc" | "desc">;
  limit?: number;
};

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "table"
  | "kpi"
  | "sankey"
  | "treemap"
  | "sunburst"
  | "gauge"
  | "streamgraph"
  | "bullet"
  | "dependencyWheel";

export const BASIC_CHART_TYPES: ChartType[] = ["table", "bar", "line", "pie", "kpi"];
export const ADVANCED_CHART_TYPES: ChartType[] = [
  "sankey",
  "treemap",
  "sunburst",
  "gauge",
  "streamgraph",
  "bullet",
  "dependencyWheel",
];

// Configuração de "merged results" — combina esta query com a de outro
// SavedChart, casando pela dimensão escolhida em cada lado (full outer
// join em memória, ver src/lib/merge-results.ts).
export type MergeConfig = {
  otherChartId: string;
  otherChartName: string;
  joinOwnDimension: string;
  joinOtherDimension: string;
};

export type ChartConfig = {
  showLegend?: boolean;
  horizontal?: boolean; // só se aplica a chartType "bar"
  numberFormat?: "default" | "currency" | "percent" | "compact";
  tableCalculations?: import("@/lib/table-calculations").TableCalc[];
  merge?: MergeConfig;
};

export type CubeRow = Record<string, string | number | boolean | null>;
