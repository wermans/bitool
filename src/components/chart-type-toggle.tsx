"use client";

import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion } from "framer-motion";
import { ADVANCED_CHART_TYPES, BASIC_CHART_TYPES, type ChartType } from "@/lib/cube-types";
import {
  TableIcon,
  BarIcon,
  LineIcon,
  PieIcon,
  KpiIcon,
  SankeyIcon,
  TreemapIcon,
  SunburstIcon,
  GaugeIcon,
  StreamgraphIcon,
  BulletIcon,
  DependencyWheelIcon,
} from "@/components/chart-icons";

const ICONS: Record<ChartType, React.ReactNode> = {
  table: <TableIcon />,
  bar: <BarIcon />,
  line: <LineIcon />,
  pie: <PieIcon />,
  kpi: <KpiIcon />,
  sankey: <SankeyIcon />,
  treemap: <TreemapIcon />,
  sunburst: <SunburstIcon />,
  gauge: <GaugeIcon />,
  streamgraph: <StreamgraphIcon />,
  bullet: <BulletIcon />,
  dependencyWheel: <DependencyWheelIcon />,
};

const LABELS: Record<ChartType, string> = {
  table: "Tabela",
  bar: "Barras",
  line: "Linha",
  pie: "Pizza",
  kpi: "KPI",
  sankey: "Sankey",
  treemap: "Treemap",
  sunburst: "Sunburst",
  gauge: "Gauge",
  streamgraph: "Streamgraph",
  bullet: "Bullet",
  dependencyWheel: "Dependency wheel",
};

/**
 * Seletor de tipo de gráfico em duas camadas — como o "Change chart" do
 * Looker: os 5 tipos básicos ficam sempre visíveis (ícones, indicador
 * deslizante); os "avançados" (sankey/treemap/sunburst/gauge/streamgraph)
 * ficam num menu "Mais" para não poluir a barra principal.
 */
export function ChartTypeToggle({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (v: ChartType) => void;
}) {
  const isAdvanced = ADVANCED_CHART_TYPES.includes(value);

  return (
    <div className="inline-flex items-center gap-2">
      <ToggleGroup.Root
        type="single"
        value={isAdvanced ? undefined : value}
        onValueChange={(v) => {
          if (v) onChange(v as ChartType);
        }}
        className="inline-flex gap-1 rounded-xl bg-muted p-1"
        aria-label="Tipo de visualização"
      >
        {BASIC_CHART_TYPES.map((type) => (
          <ToggleGroup.Item
            key={type}
            value={type}
            title={LABELS[type]}
            aria-label={LABELS[type]}
            className="relative flex h-11 w-12 items-center justify-center rounded-lg text-muted-foreground outline-none transition-colors data-[state=on]:text-primary"
          >
            {value === type && (
              <motion.div
                layoutId="chart-type-indicator"
                className="absolute inset-0 rounded-lg bg-background shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10">{ICONS[type]}</span>
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className={`flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm transition-colors ${
              isAdvanced
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {isAdvanced ? (
              <>
                <span className="h-5 w-5">{ICONS[value]}</span>
                {LABELS[value]}
              </>
            ) : (
              "Mais…"
            )}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={6}
            className="z-50 min-w-[10rem] rounded-md border border-border bg-background p-1 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            {ADVANCED_CHART_TYPES.map((type) => (
              <DropdownMenu.Item
                key={type}
                onSelect={() => onChange(type)}
                className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted ${
                  value === type ? "text-primary" : ""
                }`}
              >
                <span className="h-4 w-4">{ICONS[type]}</span>
                {LABELS[type]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
