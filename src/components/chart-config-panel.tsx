"use client";

import * as Popover from "@radix-ui/react-popover";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as Select from "@radix-ui/react-select";
import type { ChartConfig, ChartType } from "@/lib/cube-types";

const NUMBER_FORMATS: { value: NonNullable<ChartConfig["numberFormat"]>; label: string }[] = [
  { value: "default", label: "Padrão" },
  { value: "currency", label: "Moeda (R$)" },
  { value: "percent", label: "Porcentagem" },
  { value: "compact", label: "Compacto (1,2 mi)" },
];

function ConfigSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between text-sm">
      {label}
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="relative h-5 w-9 shrink-0 rounded-full bg-muted outline-none transition-colors data-[state=checked]:bg-primary"
      >
        <SwitchPrimitive.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-background shadow transition-transform duration-200 will-change-transform data-[state=checked]:translate-x-4" />
      </SwitchPrimitive.Root>
    </label>
  );
}

/**
 * Painel de configuração do gráfico (Radix Popover, preview ao vivo — não
 * dispara nova query, só muda como o resultado já carregado é desenhado).
 * Formato numérico usa Radix Select; toggles usam Radix Switch — as duas
 * dependências já estavam instaladas e nunca tinham sido usadas.
 */
export function ChartConfigPanel({
  chartType,
  config,
  onChange,
}: {
  chartType: ChartType;
  config: ChartConfig;
  onChange: (c: ChartConfig) => void;
}) {
  const supportsLegend = !["kpi", "gauge", "table"].includes(chartType);
  const supportsHorizontal = chartType === "bar";

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="flex h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
          Configurar
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-64 space-y-4 rounded-md border border-border bg-background p-4 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Formato do número
            </p>
            <Select.Root
              value={config.numberFormat ?? "default"}
              onValueChange={(v) =>
                onChange({ ...config, numberFormat: v as ChartConfig["numberFormat"] })
              }
            >
              <Select.Trigger className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-sm outline-none">
                <Select.Value />
                <Select.Icon>▾</Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content className="z-50 overflow-hidden rounded-md border border-border bg-background shadow-lg">
                  <Select.Viewport className="p-1">
                    {NUMBER_FORMATS.map((opt) => (
                      <Select.Item
                        key={opt.value}
                        value={opt.value}
                        className="cursor-pointer rounded px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted"
                      >
                        <Select.ItemText>{opt.label}</Select.ItemText>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {supportsLegend && (
            <ConfigSwitch
              label="Mostrar legenda"
              checked={config.showLegend !== false}
              onCheckedChange={(v) => onChange({ ...config, showLegend: v })}
            />
          )}

          {supportsHorizontal && (
            <ConfigSwitch
              label="Barras horizontais"
              checked={config.horizontal === true}
              onCheckedChange={(v) => onChange({ ...config, horizontal: v })}
            />
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
