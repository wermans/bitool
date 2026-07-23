"use client";

import { useEffect, useState } from "react";
import type { CubeFilter } from "@/lib/cube-types";

type DimensionOption = { name: string; title: string };

/**
 * Filtros em cascata "de verdade": cada dropdown de valor consulta o Cube.js
 * (via /api/cube/query) restringindo pelos DEMAIS filtros já selecionados —
 * escolher uma dimensão estreita as opções das próximas, exatamente como em
 * Looker/Lightdash, em vez de um campo de texto livre.
 */
export function CascadingFilterBar({
  filters,
  setFilters,
  canEdit,
  onSave,
  saving,
  dimensions,
}: {
  filters: CubeFilter[];
  setFilters: (f: CubeFilter[]) => void;
  canEdit: boolean;
  onSave: () => void;
  saving: boolean;
  dimensions: DimensionOption[];
}) {
  function updateFilter(index: number, patch: Partial<CubeFilter>) {
    setFilters(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addFilter() {
    setFilters([...filters, { member: "", operator: "equals", values: [] }]);
  }

  function removeFilter(index: number) {
    setFilters(filters.filter((_, i) => i !== index));
  }

  const complete = filters.every((f) => f.member && f.values.length > 0);

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-3">
        {filters.map((filter, i) => (
          <FilterControl
            key={i}
            filter={filter}
            otherFilters={filters.filter((_, idx) => idx !== i)}
            dimensions={dimensions}
            canEdit={canEdit}
            onChange={(patch) => updateFilter(i, patch)}
            onRemove={() => removeFilter(i)}
          />
        ))}
        {filters.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum filtro em cascata configurado.
          </p>
        )}
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <button
            onClick={addFilter}
            className="rounded-md border border-border px-2 py-1 text-xs"
          >
            + filtro
          </button>
          <button
            onClick={onSave}
            disabled={saving || !complete}
            className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar filtros"}
          </button>
        </div>
      )}
    </div>
  );
}

function FilterControl({
  filter,
  otherFilters,
  dimensions,
  canEdit,
  onChange,
  onRemove,
}: {
  filter: CubeFilter;
  otherFilters: CubeFilter[];
  dimensions: DimensionOption[];
  canEdit: boolean;
  onChange: (patch: Partial<CubeFilter>) => void;
  onRemove: () => void;
}) {
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Restringe pelas OUTRAS dimensões já preenchidas — nunca pela própria,
  // senão o valor escolhido reduziria as próprias opções a si mesmo.
  const constraintKey = JSON.stringify(
    otherFilters.filter((f) => f.member && f.values.length > 0)
  );

  useEffect(() => {
    if (!filter.member) {
      setOptions([]);
      return;
    }
    const constraints: CubeFilter[] = JSON.parse(constraintKey);
    setLoading(true);
    fetch("/api/cube/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: { dimensions: [filter.member], filters: constraints, limit: 1000 },
      }),
    })
      .then((r) => r.json())
      .then((body) => {
        const rows: Record<string, unknown>[] = body.data ?? [];
        const values = Array.from(
          new Set(rows.map((row) => String(row[filter.member] ?? "")).filter(Boolean))
        ).sort();
        setOptions(values);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter.member, constraintKey]);

  if (!canEdit && !(filter.member && filter.values.length > 0)) return null;

  if (!canEdit) {
    return (
      <span className="rounded-full bg-muted px-3 py-1 text-xs">
        {filter.member} = {filter.values[0]}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={filter.member}
        onChange={(e) => onChange({ member: e.target.value, values: [] })}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs"
      >
        <option value="">Dimensão...</option>
        {dimensions.map((d) => (
          <option key={d.name} value={d.name}>
            {d.title}
          </option>
        ))}
      </select>
      <select
        value={filter.values[0] ?? ""}
        onChange={(e) => onChange({ values: e.target.value ? [e.target.value] : [] })}
        disabled={!filter.member || loading}
        className="rounded-md border border-border bg-background px-2 py-1 text-xs disabled:opacity-50"
      >
        <option value="">{loading ? "Carregando..." : "Valor..."}</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <button onClick={onRemove} className="text-sm text-muted-foreground">
        ×
      </button>
    </div>
  );
}
