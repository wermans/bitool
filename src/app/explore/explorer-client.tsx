"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CubeChart } from "@/components/cube-chart";
import type { ChartType, CubeQuery } from "@/lib/cube-types";

type CubeMember = { name: string; title: string };
type CubeMeta = { name: string; title: string; measures: CubeMember[]; dimensions: CubeMember[] };
type Space = { id: string; name: string };

const CHART_TYPES: ChartType[] = ["table", "bar", "line", "pie", "kpi"];

export function ExplorerClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const spaceIdParam = searchParams.get("spaceId");
  const chartIdParam = searchParams.get("chartId");

  const [cubes, setCubes] = useState<CubeMeta[]>([]);
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>("table");
  const [chartName, setChartName] = useState("Novo gráfico");
  const [spaceId, setSpaceId] = useState(spaceIdParam ?? "");
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [editingChartId, setEditingChartId] = useState<string | null>(chartIdParam);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
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
    setSaveMessage(null);

    const payload = {
      name: chartName,
      spaceId,
      chartType,
      cubeQuery: query,
    };

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
      setSaveMessage(typeof data.error === "string" ? data.error : "Erro ao salvar.");
      return;
    }
    const saved = await res.json();
    setEditingChartId(saved.id);
    setSaveMessage("Gráfico salvo.");
    router.push(`/explore?chartId=${saved.id}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        {cubes.map((cube) => (
          <div key={cube.name} className="rounded-md border border-border p-3">
            <h3 className="mb-2 text-sm font-semibold">{cube.title}</h3>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Measures</p>
              {cube.measures.map((m) => (
                <label key={m.name} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedMeasures.includes(m.name)}
                    onChange={() => toggleMeasure(m.name)}
                  />
                  {m.title}
                </label>
              ))}
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                Dimensions
              </p>
              {cube.dimensions.map((d) => (
                <label key={d.name} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDimensions.includes(d.name)}
                    onChange={() => toggleDimension(d.name)}
                  />
                  {d.title}
                </label>
              ))}
            </div>
          </div>
        ))}
        {cubes.length === 0 && (
          <p className="text-sm text-muted-foreground">Carregando cubes...</p>
        )}
      </aside>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {CHART_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                chartType === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-md border border-border p-4">
          {query ? (
            <CubeChart query={query} chartType={chartType} height={360} />
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Selecione ao menos uma measure ou dimension.
            </p>
          )}
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
          {saveMessage && <p className="text-sm">{saveMessage}</p>}
        </div>
      </div>
    </div>
  );
}
