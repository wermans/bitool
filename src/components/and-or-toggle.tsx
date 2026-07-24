"use client";

import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { motion } from "framer-motion";
import type { FilterLogic } from "@/lib/filter-groups";

/**
 * Toggle AND/OR com indicador deslizante — mesmo padrão do ChartTypeToggle.
 * `layoutId` precisa ser único por instância na tela (cada grupo de filtros
 * tem o seu), já que várias instâncias podem coexistir simultaneamente.
 */
export function AndOrToggle({
  value,
  onChange,
  layoutId,
}: {
  value: FilterLogic;
  onChange: (v: FilterLogic) => void;
  layoutId: string;
}) {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as FilterLogic);
      }}
      className="inline-flex rounded-full bg-muted p-0.5"
      aria-label="Lógica entre filtros"
    >
      {(["and", "or"] as const).map((opt) => (
        <ToggleGroup.Item
          key={opt}
          value={opt}
          className="relative flex h-6 w-10 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wide text-muted-foreground outline-none data-[state=on]:text-primary-foreground"
        >
          {value === opt && (
            <motion.div
              layoutId={layoutId}
              className="absolute inset-0 rounded-full bg-primary"
              transition={{ type: "spring", bounce: 0.2, duration: 0.35 }}
            />
          )}
          <span className="relative z-10">{opt}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  );
}
