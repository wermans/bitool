"use client";

import { useEffect, useState } from "react";
import type { MergeConfig } from "@/lib/cube-types";

type ChartOption = { id: string; name: string; cubeQuery: { dimensions?: string[] } };

/**
 * "Merged results" do Looker — combina o resultado desta query com o de
 * outro gráfico salvo, casando pela dimensão escolhida em cada lado (join
 * em memória, feito no CubeChart via useMergedRows). Útil quando os dois
 * conjuntos não podem ser unidos numa query só do Cube.js (cubes/fontes
 * diferentes sem join definido no schema).
 */
export function MergeConfigEditor({
  ownDimensions,
  merge,
  onChange,
  excludeChartId,
}: {
  ownDimensions: string[];
  merge: MergeConfig | undefined;
  onChange: (m: MergeConfig | undefined) => void;
  excludeChartId?: string;
}) {
  const [charts, setCharts] = useState<ChartOption[]>([]);
  const [enabled, setEnabled] = useState(Boolean(merge));
  const [otherChartId, setOtherChartId] = useState(merge?.otherChartId ?? "");
  const [joinOwn, setJoinOwn] = useState(merge?.joinOwnDimension ?? "");
  const [joinOther, setJoinOther] = useState(merge?.joinOtherDimension ?? "");

  useEffect(() => {
    fetch("/api/charts")
      .then((r) => r.json())
      .then((d) => setCharts(Array.isArray(d) ? d : []));
  }, []);

  if (ownDimensions.length === 0) return null;

  const otherChart = charts.find((c) => c.id === otherChartId);
  const otherDimensions = otherChart?.cubeQuery?.dimensions ?? [];
  const canApply = Boolean(otherChartId && joinOwn && joinOther);

  function apply() {
    if (!canApply) return;
    onChange({
      otherChartId,
      otherChartName: otherChart?.name ?? "",
      joinOwnDimension: joinOwn,
      joinOtherDimension: joinOther,
    });
  }

  function disable() {
    setEnabled(false);
    onChange(undefined);
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => (e.target.checked ? setEnabled(true) : disable())}
        />
        Mesclar com outro gráfico
      </label>

      {enabled && (
        <div className="space-y-2">
          {merge && (
            <p className="text-xs text-muted-foreground">
              Mesclado com <strong>{merge.otherChartName}</strong> — {merge.joinOwnDimension} ={" "}
              {merge.joinOtherDimension}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={otherChartId}
              onChange={(e) => {
                setOtherChartId(e.target.value);
                setJoinOther("");
              }}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Gráfico...</option>
              {charts
                .filter((c) => c.id !== excludeChartId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            <select
              value={joinOwn}
              onChange={(e) => setJoinOwn(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs"
            >
              <option value="">Sua dimensão...</option>
              {ownDimensions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">=</span>
            <select
              value={joinOther}
              onChange={(e) => setJoinOther(e.target.value)}
              disabled={!otherChartId}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-50"
            >
              <option value="">Dimensão do outro...</option>
              {otherDimensions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              onClick={apply}
              disabled={!canApply}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
