"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  newTableCalc,
  TABLE_CALC_LABELS,
  type TableCalc,
  type TableCalcFn,
} from "@/lib/table-calculations";

const FNS: TableCalcFn[] = ["percentOfTotal", "runningTotal", "delta", "percentChange", "rank"];

/**
 * "Colunas calculadas" — a versão segura de custom field/table calculation:
 * um conjunto curado de funções (sem editor de fórmula livre, ver nota em
 * table-calculations.ts) aplicadas sobre uma measure já selecionada,
 * visíveis apenas na visualização em tabela.
 */
export function TableCalcEditor({
  measures,
  calcs,
  onChange,
}: {
  measures: string[];
  calcs: TableCalc[];
  onChange: (calcs: TableCalc[]) => void;
}) {
  const [fn, setFn] = useState<TableCalcFn>("percentOfTotal");
  const [sourceMeasure, setSourceMeasure] = useState(measures[0] ?? "");

  if (measures.length === 0) return null;

  function addCalc() {
    const measure = sourceMeasure || measures[0];
    if (!measure) return;
    onChange([...calcs, newTableCalc(fn, measure)]);
  }
  function removeCalc(id: string) {
    onChange(calcs.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Colunas calculadas
        <span className="ml-1 font-normal normal-case text-muted-foreground/70">
          (aparecem na visualização em tabela)
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {calcs.map((c) => (
            <motion.span
              key={c.id}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
            >
              {c.label}
              <button
                onClick={() => removeCalc(c.id)}
                className="text-muted-foreground hover:text-red-600"
              >
                ×
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={fn}
          onChange={(e) => setFn(e.target.value as TableCalcFn)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {FNS.map((f) => (
            <option key={f} value={f}>
              {TABLE_CALC_LABELS[f]}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">de</span>
        <select
          value={sourceMeasure}
          onChange={(e) => setSourceMeasure(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
        >
          {measures.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          onClick={addCalc}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          + adicionar
        </button>
      </div>
    </div>
  );
}
