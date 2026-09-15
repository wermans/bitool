"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useToast } from "@/components/toast";
import { useManualQuery } from "@/hooks/use-manual-query";
import { validateFieldsForChartType } from "@/lib/chart-transform";
import { buildCsv, downloadCsv } from "@/lib/csv-export";
import { TopBar } from "./top-bar";
import { ActionsMenu } from "./actions-menu";
import { SaveDialog } from "./save-dialog";
import { CombineResultsDialog } from "./combine-results-dialog";
import { FieldPicker, type CubeMeta } from "./field-picker";
import { FiltersSection } from "./filters-section";
import { VisualizationSection } from "./visualization-section";
import { DataSection, type DataTab } from "./data-section";
import { emptyFilterState, newFilter, newGroup, normalizeFilterState, toCubeFilters } from "@/lib/filter-groups";
import type { ChartConfig, ChartType, CubeQuery } from "@/lib/cube-types";

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
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  // Fase 6: Salvar e Combinar resultados viraram modais abertos pelo menu
  // ⚙ Ações; Data (tab/aberta) também é controlada daqui pra "Obter SQL"
  // poder forçar a seção aberta na aba certa.
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [combineDialogOpen, setCombineDialogOpen] = useState(false);
  const [dataSectionOpen, setDataSectionOpen] = useState(true);
  const [dataTab, setDataTab] = useState<DataTab>("results");

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
        const loadedConfig = (chart.chartConfig as ChartConfig) ?? {};
        setChartConfig({
          ...loadedConfig,
          filterState: normalizeFilterState(loadedConfig.filterState),
        });
        setChartName(chart.name);
        setSpaceId(chart.spaceId);
        setEditingChartId(chart.id);
      });
  }, [chartIdParam]);

  const allDimensions = useMemo(
    () => cubes.flatMap((c) => c.dimensions.map((d) => ({ name: d.name, title: d.title }))),
    [cubes]
  );
  const filterState = chartConfig.filterState ?? emptyFilterState();

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

  function isFieldFilterActive(name: string) {
    return filterState.groups.some((g) => g.filters.some((f) => f.member === name));
  }

  // Ícone de funil no hover do campo (spec 2.5/3) — liga/desliga o campo
  // como filtro. Adiciona no primeiro grupo existente (ou cria um) quando
  // ativa; remove todas as ocorrências do campo quando desativa.
  function toggleFieldFilter(name: string) {
    setChartConfig((prev) => {
      const state = prev.filterState ?? emptyFilterState();
      if (isFieldFilterActive(name)) {
        const groups = state.groups
          .map((g) => ({ ...g, filters: g.filters.filter((f) => f.member !== name) }))
          .filter((g) => g.filters.length > 0);
        return { ...prev, filterState: { ...state, groups } };
      }
      const filter = { ...newFilter(), member: name };
      const groups =
        state.groups.length === 0
          ? [{ ...newGroup(), filters: [filter] }]
          : state.groups.map((g, i) => (i === 0 ? { ...g, filters: [...g.filters, filter] } : g));
      return { ...prev, filterState: { ...state, groups } };
    });
  }

  const rowLimit = chartConfig.rowLimit ?? 500;

  const query: CubeQuery | null =
    selectedMeasures.length > 0 || selectedDimensions.length > 0
      ? {
          measures: selectedMeasures,
          dimensions: selectedDimensions,
          filters: toCubeFilters(filterState),
          limit: rowLimit,
        }
      : null;

  // Run manual (spec 7.1): nada busca sozinho — só o clique em Run, via
  // useManualQuery. `executedQuery` é o snapshot da última query rodada, e é
  // isso que Visualization/Data-Results devem exibir, não a `query` ao vivo
  // (que pode já estar *stale* por causa de campos/filtros mudados depois).
  const {
    data,
    loading,
    error,
    stale,
    executedQuery,
    lastRunAt,
    execTimeMs,
    cacheHit,
    run,
    stop,
  } = useManualQuery(query, chartConfig.merge);

  const validationError = executedQuery
    ? chartConfig.merge
      ? null
      : validateFieldsForChartType(chartType, executedQuery.measures, executedQuery.dimensions)
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
    setSaveDialogOpen(false);
    const spaceName = spaces.find((s) => s.id === spaceId)?.name ?? "";
    toast({
      title: `"${chartName}" foi ${editingChartId ? "atualizado" : "salvo"} no Space "${spaceName}"`,
      variant: "success",
      action: { label: "Ver Space", href: `/spaces/${spaceId}` },
    });
    router.push(`/explore?chartId=${saved.id}`);
  }

  function handleDownloadCsv() {
    if (!executedQuery || data.length === 0) return;
    const csv = buildCsv(data, executedQuery, Boolean(chartConfig.merge));
    downloadCsv(`${chartName || "resultados"}.csv`, csv);
  }

  function handleGetSql() {
    setDataSectionOpen(true);
    setDataTab("sql");
  }

  function handleClearFieldsAndFilters() {
    setSelectedMeasures([]);
    setSelectedDimensions([]);
    setChartConfig((prev) => ({ ...prev, filterState: emptyFilterState() }));
  }

  return (
    <div className="space-y-4">
      <TopBar
        rowCount={executedQuery ? data.length : undefined}
        execTimeMs={executedQuery ? execTimeMs ?? undefined : undefined}
        lastRunAt={lastRunAt}
        cacheHit={cacheHit}
        stale={stale}
        running={loading}
        canRun={Boolean(query)}
        onRun={run}
        onStop={stop}
        actionsMenu={
          <ActionsMenu
            onSave={() => setSaveDialogOpen(true)}
            canSave={Boolean(query)}
            onDownloadCsv={handleDownloadCsv}
            canDownload={Boolean(executedQuery && data.length > 0)}
            onGetSql={handleGetSql}
            canGetSql={Boolean(query)}
            onCombineResults={() => setCombineDialogOpen(true)}
            canCombineResults={selectedDimensions.length > 0}
            onClearFieldsAndFilters={handleClearFieldsAndFilters}
            canClearFieldsAndFilters={Boolean(query) || filterState.groups.length > 0}
            onClearCacheAndRefresh={run}
            canClearCacheAndRefresh={Boolean(query)}
          />
        }
      />

      <div className="flex items-start gap-4">
        <motion.div
          initial={false}
          animate={{ width: leftPanelCollapsed ? 0 : 320, opacity: leftPanelCollapsed ? 0 : 1 }}
          transition={{ duration: 0.15 }}
          className="shrink-0 overflow-hidden"
        >
          <div className="w-80">
            <FieldPicker
              cubes={cubes}
              selectedMeasures={selectedMeasures}
              selectedDimensions={selectedDimensions}
              onToggleMeasure={toggleMeasure}
              onToggleDimension={toggleDimension}
              onCollapse={() => setLeftPanelCollapsed(true)}
              isFieldFilterActive={isFieldFilterActive}
              onToggleFieldFilter={toggleFieldFilter}
            />
          </div>
        </motion.div>

        {leftPanelCollapsed && (
          <button
            onClick={() => setLeftPanelCollapsed(false)}
            title="Expandir painel de campos"
            className="flex h-9 w-6 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground"
          >
            ›
          </button>
        )}

        <div className="min-w-0 flex-1 space-y-3">
          <FiltersSection
            state={filterState}
            onChange={(next) => setChartConfig((prev) => ({ ...prev, filterState: next }))}
            dimensions={allDimensions}
          />

          <VisualizationSection
            data={data}
            loading={loading}
            error={error}
            validationError={validationError}
            chartType={chartType}
            onChartTypeChange={setChartType}
            chartConfig={chartConfig}
            onChartConfigChange={setChartConfig}
            query={query}
            executedQuery={executedQuery}
          />

          <DataSection
            data={data}
            loading={loading}
            error={error}
            query={query}
            executedQuery={executedQuery}
            selectedMeasures={selectedMeasures}
            chartConfig={chartConfig}
            onChartConfigChange={setChartConfig}
            open={dataSectionOpen}
            onOpenChange={setDataSectionOpen}
            tab={dataTab}
            onTabChange={setDataTab}
          />
        </div>
      </div>

      <SaveDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        chartName={chartName}
        onChartNameChange={setChartName}
        spaceId={spaceId}
        onSpaceIdChange={setSpaceId}
        spaces={spaces}
        onSave={handleSave}
        saving={saving}
        canSave={Boolean(query && spaceId)}
        saveLabel={editingChartId ? "Atualizar gráfico" : "Salvar como gráfico"}
      />

      <CombineResultsDialog
        open={combineDialogOpen}
        onOpenChange={setCombineDialogOpen}
        ownDimensions={selectedDimensions}
        merge={chartConfig.merge}
        onChange={(merge) => setChartConfig((prev) => ({ ...prev, merge }))}
        excludeChartId={editingChartId ?? undefined}
      />
    </div>
  );
}
