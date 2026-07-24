"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CubeChart } from "@/components/cube-chart";
import { ChartTypeToggle } from "@/components/chart-type-toggle";
import { ChartConfigPanel } from "@/components/chart-config-panel";
import { useToast } from "@/components/toast";
import { FieldPicker, type CubeMeta } from "./field-picker";
import { TableCalcEditor } from "./table-calc-editor";
import { MergeConfigEditor } from "./merge-config-editor";
import type { ChartConfig, ChartType, CubeQuery, MergeConfig } from "@/lib/cube-types";
import type { TableCalc } from "@/lib/table-calculations";

type Space = { id: string; name: string };

export function ExplorerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const spaceIdParam = searchParams.get("spaceId");
  const chartIdParam = searchParams.get("chartId");

  const [cubes, setCubes] = useState<CubeMeta[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>("table");
  const [chartConfig, setChartConfig] = useState<ChartConfig>({});
  const [chartName, setChartName] = useState("Novo gráfico");
  const [spaceId, setSpaceId] = useState(spaceIdParam ?? "");
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [editingChartId, setEditingChartId] = useState<string | null>(chartIdParam);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/cube/meta")
      .then((r) => r.json())
      .then((d) => setCubes(d.cubes ?? []));
    fetch("/api/spaces")
      .then((r) => r.json())
      .then((d) => setSpaces(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!chartIdParam) return;
    fetch(`/api/charts/${chartIdParam}`)
      .then((r) => r.json())
      .then((chart) => {
        if (chart.error) return;
        const q = chart.cubeQuery as CubeQuery;
        setSelectedMeasures(q.measures ?? []);
        setSelectedDimensions(q.dimensions ?? []);
        setChartType(chart.chartType);
        setChartConfig((chart.chartConfig as ChartConfig) ?? {});
        setChartName(chart.name);
        setSpaceId(chart.spaceId);
        setEditingChartId(chart.id);
      });
  }, [chartIdParam]);

  function toggleMeasure(name: string) {
    setSelectedMeasures((prev) =>
      prev.includes(name) ? prev.filter((m) => m !== name) : [...prev, name]
    );
  }
  function toggleDimension(name: string) {
    setSelectedDimensions((prev) =>
      prev.includes(name) ? prev.filter((d) => d !== name) : [...prev, name]
    );
  }

  const query: CubeQuery | null =
    selectedMeasures.length > 0 || selectedDimensions.length > 0
      ? { measures: selectedMeasures, dimensions: selectedDimensions, limit: 500 }
      : null;

  async function handleSave() {
    if (!query || !spaceId) return;
    setSaving(true);

    const payload = { name: chartName, spaceId, chartType, cubeQuery: query, chartConfig };

    const res = editingChartId
      ? await fetch(`/api/charts/${editingChartId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/charts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({
        title: "Erro ao salvar gráfico",
        description: typeof data.error === "string" ? data.error : undefined,
        variant: "error",
      });
      return;
    }
    const saved = await res.json();
    setEditingChartId(saved.id);
    toast({
      title: editingChartId ? "Gráfico atualizado" : "Gráfico salvo",
      description: chartName,
      variant: "success",
    });
    router.push(`/explore?chartId=${saved.id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside>
        <FieldPicker
          cubes={cubes}
          selectedMeasures={selectedMeasures}
          selectedDimensions={selectedDimensions}
          onToggleMeasure={toggleMeasure}
          onToggleDimension={toggleDimension}
        />
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ChartTypeToggle value={chartType} onChange={setChartType} />
          <ChartConfigPanel chartType={chartType} config={chartConfig} onChange={setChartConfig} />
        </div>

        <TableCalcEditor
          measures={selectedMeasures}
          calcs={chartConfig.tableCalculations ?? []}
          onChange={(tableCalculations: TableCalc[]) =>
            setChartConfig((prev) => ({ ...prev, tableCalculations }))
          }
        />

        <MergeConfigEditor
          ownDimensions={selectedDimensions}
          merge={chartConfig.merge}
          onChange={(merge: MergeConfig | undefined) =>
            setChartConfig((prev) => ({ ...prev, merge }))
          }
          excludeChartId={editingChartId ?? undefined}
        />

        <div className="rounded-md border border-border p-4">
          <AnimatePresence mode="wait">
            {query ? (
              <motion.div
                key={chartType + JSON.stringify(query)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <CubeChart query={query} chartType={chartType} config={chartConfig} height={360} />
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center text-sm text-muted-foreground"
              >
                Selecione ao menos uma measure ou dimension.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-md border border-border p-4">
          <div className="space-y-1">
            <label className="text-xs font-medium">Nome do gráfico</label>
            <input
              value={chartName}
              onChange={(e) => setChartName(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium">Space</label>
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecione...</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSave}
            disabled={!query || !spaceId || saving}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvando..." : editingChartId ? "Atualizar gráfico" : "Salvar como gráfico"}
          </button>
        </div>
      </div>
    </div>
  );
}
