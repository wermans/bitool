"use client";

import { CollapsibleSection } from "./collapsible-section";
import { FilterGroupsEditor } from "@/components/filter-groups-editor";
import type { FilterState } from "@/lib/filter-groups";

type DimensionOption = { name: string; title: string };

/**
 * Seção Filters — reaproveita 100% o builder AND/OR já usado nos
 * Dashboards. No Explorer não existe um "Salvar filtros" próprio: os
 * filtros viajam junto com o resto da query no botão de salvar geral da
 * seção Data, por isso `onSave` fica de fora.
 */
export function FiltersSection({
  state,
  onChange,
  dimensions,
}: {
  state: FilterState;
  onChange: (s: FilterState) => void;
  dimensions: DimensionOption[];
}) {
  return (
    <CollapsibleSection title="Filters">
      <FilterGroupsEditor state={state} onChange={onChange} canEdit dimensions={dimensions} />
    </CollapsibleSection>
  );
}
