"use client";

import { useEffect, useMemo, useState } from "react";
import GridLayout, { WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { AnimatePresence, motion } from "framer-motion";
import { CubeChart } from "@/components/cube-chart";
import { FilterGroupsEditor } from "@/components/filter-groups-editor";
import { toCubeFilters, type FilterState } from "@/lib/filter-groups";
import type { ChartConfig, CubeFilter, CubeQuery, ChartType } from "@/lib/cube-types";

const Grid = WidthProvider(GridLayout);

type SavedChartRef = {
  id: string;
  name: string;
  chartType: string;
  cubeQuery: { measures: string[]; dimensions: string[]; timeDimensions?: { dimension: string; granularity?: string }[] };
  chartConfig?: ChartConfig;
};

type Widget = {
  id: string;
  title: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  savedChart: SavedChartRef | null;
};

export function DashboardClient({
  dashboardId,
  canEdit,
  initialFilters,
  widgets: initialWidgets,
  availableCharts,
}: {
  dashboardId: string;
  canEdit: boolean;
  initialFilters: FilterState;
  widgets: Widget[];
  availableCharts: { id: string; name: string }[];
}) {
  const [widgets, setWidgets] = useState(initialWidgets);
  const [editMode, setEditMode] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>(initialFilters);
  const [crossFilter, setCrossFilter] = useState<CubeFilter | null>(null);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [savingFilters, setSavingFilters] = useState(false);
  const [dimensions, setDimensions] = useState<{ name: string; title: string }[]>([]);

  useEffect(() => {
    fetch("/api/cube/meta")
      .then((r) => r.json())
      .then((d) => {
        const cubes: { dimensions: { name: string; title: string }[] }[] = d.cubes ?? [];
        setDimensions(cubes.flatMap((c) => c.dimensions));
      });
  }, []);

  const activeFilters = useMemo(
    () => [...toCubeFilters(filterState), ...(crossFilter ? [crossFilter] : [])],
    [filterState, crossFilter]
  );

  function buildQuery(chart: SavedChartRef): CubeQuery {
    return {
      ...chart.cubeQuery,
      filters: activeFilters,
    };
  }

  async function saveLayout(next: Widget[]) {
    await fetch(`/api/dashboards/${dashboardId}/widgets`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        layout: next.map((w) => ({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h })),
      }),
    });
  }

  function handleLayoutChange(layout: { i: string; x: number; y: number; w: number; h: number }[]) {
    if (!editMode) return;
    const next = widgets.map((w) => {
      const l = layout.find((item) => item.i === w.id);
      return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
    });
    setWidgets(next);
    saveLayout(next);
  }

  async function addWidget(savedChartId: string) {
    const res = await fetch(`/api/dashboards/${dashboardId}/widgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savedChartId, x: 0, y: Infinity, w: 6, h: 4 }),
    });
    if (res.ok) {
      // Recarrega para trazer o widget com o cubeQuery completo do gráfico,
      // já resolvido no server component — mais simples do que duplicar
      // aqui a forma de buscar o SavedChart inteiro.
      window.location.reload();
    }
  }

  async function removeWidget(widgetId: string) {
    if (!confirm("Remover este gráfico do dashboard?")) return;
    const res = await fetch(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, {
      method: "DELETE",
    });
    if (res.ok) setWidgets((prev) => prev.filter((w) => w.id !== widgetId));
  }

  async function saveFilters() {
    setSavingFilters(true);
    await fetch(`/api/dashboards/${dashboardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filters: filterState }),
    });
    setSavingFilters(false);
  }

  return (
    <div className="space-y-4">
      <FilterGroupsEditor
        state={filterState}
        onChange={setFilterState}
        canEdit={canEdit}
        onSave={saveFilters}
        saving={savingFilters}
        dimensions={dimensions}
      />

      <AnimatePresence>
        {crossFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 overflow-hidden text-sm"
          >
            <span className="rounded-full bg-primary/10 px-3 py-1">
              Cross-filter: {crossFilter.member} = {crossFilter.values[0]}
            </span>
            <button onClick={() => setCrossFilter(null)} className="underline">
              limpar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {canEdit && (
        <div className="flex gap-2">
          <button
            onClick={() => setEditMode((s) => !s)}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            {editMode ? "Concluir edição" : "Editar layout"}
          </button>
          {editMode && (
            <button
              onClick={() => setShowAddWidget((s) => !s)}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Adicionar gráfico
            </button>
          )}
        </div>
      )}

      {showAddWidget && (
        <div className="flex flex-wrap gap-2 rounded-md border border-border p-3">
          {availableCharts.map((c) => (
            <button
              key={c.id}
              onClick={() => addWidget(c.id)}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              {c.name}
            </button>
          ))}
          {availableCharts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum gráfico salvo neste space ainda — crie um no Explorer.
            </p>
          )}
        </div>
      )}

      {widgets.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum gráfico neste dashboard ainda.
        </p>
      ) : (
        <Grid
          className="layout"
          cols={12}
          rowHeight={30}
          isDraggable={editMode}
          isResizable={editMode}
          onLayoutChange={handleLayoutChange}
          layout={widgets.map((w) => ({ i: w.id, x: w.x, y: w.y, w: w.w, h: w.h }))}
        >
          {widgets.map((w) => (
            <div key={w.id} className="rounded-md border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {w.title ?? w.savedChart?.name}
                </span>
                {editMode && (
                  <button
                    onClick={() => removeWidget(w.id)}
                    className="text-xs text-red-600 underline"
                  >
                    remover
                  </button>
                )}
              </div>
              {w.savedChart ? (
                <CubeChart
                  query={buildQuery(w.savedChart)}
                  chartType={w.savedChart.chartType as ChartType}
                  config={w.savedChart.chartConfig}
                  height={200}
                  onPointClick={(member, value) =>
                    setCrossFilter({ member, operator: "equals", values: [value] })
                  }
                />
              ) : (
                <p className="text-sm text-muted-foreground">Gráfico indisponível.</p>
              )}
            </div>
          ))}
        </Grid>
      )}
    </div>
  );
}

