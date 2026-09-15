"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CollapsibleSection } from "./collapsible-section";
import { ChartRenderer } from "@/components/chart-renderer";
import { ChartTypeToggle } from "@/components/chart-type-toggle";
import { ChartConfigPanel } from "@/components/chart-config-panel";
import type { ChartConfig, ChartType, CubeQuery, CubeRow } from "@/lib/cube-types";

/**
 * Seção Visualization — barra de tipos de gráfico e o editor de configuração
 * vivem no CABEÇALHO (aberto), como no Looker. Fase 5: renderiza a partir de
 * `executedQuery`/`data` (o que foi rodado no último Run), não da seleção
 * ao vivo — trocar campos deixa a query *stale* mas só troca o que aparece
 * aqui depois do próximo Run (spec 7.1). Trocar o tipo de gráfico continua
 * instantâneo, sem precisar de Run.
 */
export function VisualizationSection({
  data,
  loading,
  error,
  validationError,
  chartType,
  onChartTypeChange,
  chartConfig,
  onChartConfigChange,
  query,
  executedQuery,
}: {
  data: CubeRow[];
  loading: boolean;
  error: string | null;
  validationError: string | null;
  chartType: ChartType;
  onChartTypeChange: (t: ChartType) => void;
  chartConfig: ChartConfig;
  onChartConfigChange: (c: ChartConfig) => void;
  query: CubeQuery | null;
  executedQuery: CubeQuery | null;
}) {
  return (
    <CollapsibleSection
      title="Visualization"
      headerExtra={
        <>
          <ChartTypeToggle value={chartType} onChange={onChartTypeChange} />
          <ChartConfigPanel chartType={chartType} config={chartConfig} onChange={onChartConfigChange} />
        </>
      }
    >
      <AnimatePresence mode="wait">
        {!query ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center text-sm text-muted-foreground"
          >
            Selecione dimensões ou measures.
          </motion.p>
        ) : !executedQuery ? (
          <motion.p
            key="not-run"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-16 text-center text-sm text-muted-foreground"
          >
            Pressione Run para explorar os dados.
          </motion.p>
        ) : (
          <motion.div
            key={chartType + JSON.stringify(executedQuery)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
          >
            <ChartRenderer
              data={data}
              loading={loading}
              error={error}
              validationError={validationError}
              query={executedQuery}
              chartType={chartType}
              config={chartConfig}
              height={360}
              isMerged={Boolean(chartConfig.merge)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </CollapsibleSection>
  );
}
