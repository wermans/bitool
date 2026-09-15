"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence, motion } from "framer-motion";
import { AndOrToggle } from "@/components/and-or-toggle";
import {
  newFilter,
  newGroup,
  flattenOtherGroups,
  type FilterGroup,
  type FilterState,
  type UiFilter,
} from "@/lib/filter-groups";
import type { CubeFilter } from "@/lib/cube-types";

type DimensionOption = { name: string; title: string };

/**
 * Editor de filtros em grupos AND/OR — cada grupo é uma "cláusula" (ex.:
 * regiao=SP AND depto=Varejo); grupos entre si combinam com uma lógica
 * própria (ex.: (grupo A) OR (grupo B)). Dentro de um grupo, os filtros são
 * pills arrastáveis (dnd-kit) e cada dropdown de valor consulta o Cube.js ao
 * vivo, restringido pelos demais filtros ativos (cascata).
 */
export function FilterGroupsEditor({
  state,
  onChange,
  canEdit,
  onSave,
  saving,
  dimensions,
}: {
  state: FilterState;
  onChange: (s: FilterState) => void;
  canEdit: boolean;
  /** Omitido quando o "salvar" é feito por fora (ex.: Explorer, onde os
   * filtros vão junto com o resto da query no botão de salvar geral). */
  onSave?: () => void;
  saving?: boolean;
  dimensions: DimensionOption[];
}) {
  function updateGroup(groupId: string, patch: Partial<FilterGroup>) {
    onChange({
      ...state,
      groups: state.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)),
    });
  }
  function removeGroup(groupId: string) {
    onChange({ ...state, groups: state.groups.filter((g) => g.id !== groupId) });
  }
  function addGroup() {
    onChange({ ...state, groups: [...state.groups, newGroup()] });
  }

  const complete = state.groups.every((g) =>
    g.filters.every((f) => f.member && f.values.length > 0)
  );

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <AnimatePresence initial={false}>
        {state.groups.map((group, i) => (
          <motion.div
            key={group.id}
            layout
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            {i > 0 && (
              <div className="mb-2 flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <AndOrToggle
                  value={state.logic}
                  onChange={(logic) => onChange({ ...state, logic })}
                  layoutId="andor-toplevel"
                />
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <FilterGroupRow
              group={group}
              canEdit={canEdit}
              dimensions={dimensions}
              otherActiveFilters={flattenOtherGroups(state, group.id)}
              onChangeGroup={(patch) => updateGroup(group.id, patch)}
              onRemoveGroup={() => removeGroup(group.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>

      {state.groups.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhum filtro em cascata configurado.
        </p>
      )}

      {canEdit && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={addGroup}
            className="rounded-md border border-border px-2 py-1 text-xs"
          >
            + grupo de filtros
          </button>
          {onSave && (
            <button
              onClick={onSave}
              disabled={saving || !complete}
              className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar filtros"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FilterGroupRow({
  group,
  canEdit,
  dimensions,
  otherActiveFilters,
  onChangeGroup,
  onRemoveGroup,
}: {
  group: FilterGroup;
  canEdit: boolean;
  dimensions: DimensionOption[];
  otherActiveFilters: CubeFilter[];
  onChangeGroup: (patch: Partial<FilterGroup>) => void;
  onRemoveGroup: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function updateFilter(filterId: string, patch: Partial<UiFilter>) {
    onChangeGroup({
      filters: group.filters.map((f) => (f.id === filterId ? { ...f, ...patch } : f)),
    });
  }
  function removeFilter(filterId: string) {
    onChangeGroup({ filters: group.filters.filter((f) => f.id !== filterId) });
  }
  function addFilter() {
    onChangeGroup({ filters: [...group.filters, newFilter()] });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = group.filters.findIndex((f) => f.id === active.id);
    const newIndex = group.filters.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChangeGroup({ filters: arrayMove(group.filters, oldIndex, newIndex) });
  }

  return (
    <div className="rounded-md border border-dashed border-border/70 p-2">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {group.filters.length > 1 && (
            <AndOrToggle
              value={group.logic}
              onChange={(logic) => onChangeGroup({ logic })}
              layoutId={`andor-${group.id}`}
            />
          )}
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            grupo
          </span>
        </div>
        {canEdit && (
          <button
            onClick={onRemoveGroup}
            className="text-xs text-muted-foreground hover:text-red-600"
          >
            remover grupo
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={group.filters.map((f) => f.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-wrap items-center gap-2">
            {group.filters.map((filter) => (
              <SortableFilterPill
                key={filter.id}
                filter={filter}
                canEdit={canEdit}
                dimensions={dimensions}
                constraints={[
                  ...otherActiveFilters,
                  ...group.filters
                    .filter((f) => f.id !== filter.id && f.member && f.values.length > 0)
                    .map(({ id: _id, ...rest }) => rest),
                ]}
                onChange={(patch) => updateFilter(filter.id, patch)}
                onRemove={() => removeFilter(filter.id)}
              />
            ))}
            {canEdit && (
              <button
                onClick={addFilter}
                className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                + filtro
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableFilterPill({
  filter,
  canEdit,
  dimensions,
  constraints,
  onChange,
  onRemove,
}: {
  filter: UiFilter;
  canEdit: boolean;
  dimensions: DimensionOption[];
  constraints: CubeFilter[];
  onChange: (patch: Partial<UiFilter>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: filter.id,
    disabled: !canEdit,
  });
  const [options, setOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const constraintKey = JSON.stringify(constraints);

  useEffect(() => {
    if (!filter.member) {
      setOptions([]);
      return;
    }
    setLoading(true);
    fetch("/api/cube/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: { dimensions: [filter.member], filters: JSON.parse(constraintKey), limit: 1000 },
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!canEdit) {
    if (!filter.member || filter.values.length === 0) return null;
    return (
      <span className="rounded-full bg-muted px-3 py-1 text-xs">
        {filter.member} = {filter.values[0]}
      </span>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex animate-in items-center gap-1 rounded-full border border-border bg-background py-1 pl-1.5 pr-2 fade-in-0 zoom-in-95 duration-200"
    >
      <button
        {...listeners}
        type="button"
        title="Arrastar para reordenar"
        className="cursor-grab touch-none px-1 text-muted-foreground active:cursor-grabbing"
      >
        ⠿
      </button>
      <select
        value={filter.member}
        onChange={(e) => onChange({ member: e.target.value, values: [] })}
        className="rounded-md border-none bg-transparent text-xs outline-none"
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
        className="rounded-md border-none bg-transparent text-xs outline-none disabled:opacity-50"
      >
        <option value="">{loading ? "Carregando..." : "Valor..."}</option>
        {options.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        className="text-sm text-muted-foreground hover:text-red-600"
      >
        ×
      </button>
    </div>
  );
}
