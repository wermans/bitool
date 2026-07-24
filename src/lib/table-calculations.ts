import type { CubeRow } from "@/lib/cube-types";

/**
 * "Table calculations" no sentido do Looker — colunas calculadas sobre o
 * resultado JÁ retornado pelo Cube.js, no client. Deliberadamente NÃO é um
 * editor de fórmula livre: o Cube.js só aceita measures/dimensions definidas
 * no schema (`cube/schema/*.js`), não expressões SQL arbitrárias vindas do
 * client — então "custom field" vira um conjunto curado de funções seguras
 * em vez de texto livre interpretado.
 */
export type TableCalcFn = "percentOfTotal" | "runningTotal" | "delta" | "percentChange" | "rank";

export type TableCalc = {
  id: string;
  label: string;
  fn: TableCalcFn;
  sourceMeasure: string;
};

export const TABLE_CALC_LABELS: Record<TableCalcFn, string> = {
  percentOfTotal: "% do total",
  runningTotal: "Total acumulado",
  delta: "Variação vs. linha anterior",
  percentChange: "% de variação vs. linha anterior",
  rank: "Ranking",
};

export const TABLE_CALC_IS_PERCENT: Record<TableCalcFn, boolean> = {
  percentOfTotal: true,
  runningTotal: false,
  delta: false,
  percentChange: true,
  rank: false,
};

let counter = 0;
export function newTableCalc(fn: TableCalcFn, sourceMeasure: string): TableCalc {
  counter += 1;
  return {
    id: `calc_${fn}_${Date.now().toString(36)}${counter}`,
    label: `${TABLE_CALC_LABELS[fn]} (${sourceMeasure.split(".").pop()})`,
    fn,
    sourceMeasure,
  };
}

export function applyTableCalculations(data: CubeRow[], calcs: TableCalc[]): CubeRow[] {
  if (calcs.length === 0) return data;
  return calcs.reduce((rows, calc) => applyOne(rows, calc), data.map((row) => ({ ...row })));
}

function applyOne(data: CubeRow[], calc: TableCalc): CubeRow[] {
  const values = data.map((row) => Number(row[calc.sourceMeasure] ?? 0));

  switch (calc.fn) {
    case "percentOfTotal": {
      const total = values.reduce((sum, v) => sum + v, 0);
      return data.map((row, i) => ({ ...row, [calc.id]: total === 0 ? 0 : values[i] / total }));
    }
    case "runningTotal": {
      let running = 0;
      return data.map((row, i) => {
        running += values[i];
        return { ...row, [calc.id]: running };
      });
    }
    case "delta": {
      return data.map((row, i) => ({
        ...row,
        [calc.id]: i === 0 ? 0 : values[i] - values[i - 1],
      }));
    }
    case "percentChange": {
      return data.map((row, i) => {
        if (i === 0 || values[i - 1] === 0) return { ...row, [calc.id]: 0 };
        return { ...row, [calc.id]: (values[i] - values[i - 1]) / values[i - 1] };
      });
    }
    case "rank": {
      const sorted = [...values].sort((a, b) => b - a);
      return data.map((row, i) => ({ ...row, [calc.id]: sorted.indexOf(values[i]) + 1 }));
    }
  }
}
