export type CubeFilter = {
  member: string;
  operator: string;
  values: string[];
};

export type CubeQuery = {
  measures: string[];
  dimensions: string[];
  timeDimensions?: { dimension: string; granularity?: string; dateRange?: string | string[] }[];
  filters?: CubeFilter[];
  order?: Record<string, "asc" | "desc">;
  limit?: number;
};

export type ChartType = "bar" | "line" | "pie" | "table" | "kpi";

export type CubeRow = Record<string, string | number | boolean | null>;
