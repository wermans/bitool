"use client";

import { useMemo, useState } from "react";
import { Command } from "cmdk";
import * as Popover from "@radix-ui/react-popover";

type CubeMember = {
  name: string;
  title: string;
  description?: string;
  type?: string;
  isVisible?: boolean;
};
export type CubeMeta = {
  name: string;
  title: string;
  measures: CubeMember[];
  dimensions: CubeMember[];
};

type Tab = "all" | "inUse";

function isFilterOnly(f: CubeMember) {
  return f.isVisible === false;
}

const TYPE_LABEL: Record<string, string> = {
  string: "Texto",
  number: "Número",
  boolean: "Booleano",
  time: "Data/hora",
  count: "Contagem",
  countDistinct: "Contagem distinta",
  sum: "Soma",
  avg: "Média",
  min: "Mínimo",
  max: "Máximo",
};

// Ícone que não faz nada ainda (pivot fica pra uma fase futura — decisão do
// usuário: "pivot em si continua não-funcional por ora") ou que é só um
// placeholder (⋮ mais). `stopPropagation` em pointerdown/click evita que o
// clique no ícone dispare o onSelect do Command.Item por baixo.
function InertIcon({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      title={title}
      tabIndex={-1}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      className="cursor-default rounded p-0.5 text-muted-foreground/50"
    >
      {children}
    </button>
  );
}

function FieldRow({
  field,
  kind,
  active,
  searchValue,
  onSelect,
  isFilterActive,
  onToggleFilter,
}: {
  field: CubeMember;
  kind: "measure" | "dim";
  active: boolean;
  searchValue: string;
  onSelect: () => void;
  isFilterActive: boolean;
  onToggleFilter: () => void;
}) {
  const infoTitle = [
    `Tipo: ${TYPE_LABEL[field.type ?? ""] ?? field.type ?? "—"}`,
    field.description ? `Descrição: ${field.description}` : null,
    `Campo técnico: ${field.name}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Command.Item
      value={searchValue}
      onSelect={onSelect}
      className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-muted ${
        active
          ? kind === "dim"
            ? "bg-blue-50 text-blue-900"
            : "bg-amber-50 text-amber-900"
          : ""
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
          active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-transparent"
        }`}
      >
        ✓
      </span>
      <span className="flex-1 truncate">{field.title}</span>

      <span className="hidden items-center gap-1 group-hover:flex">
        {kind === "dim" && <InertIcon title="Pivotar dados (em breve)">⤢</InertIcon>}
        <button
          type="button"
          title={isFilterActive ? "Remover filtro deste campo" : "Filtrar por este campo"}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleFilter();
          }}
          className={`rounded p-0.5 ${
            isFilterActive ? "text-primary" : "text-muted-foreground/60 hover:text-foreground"
          }`}
        >
          ▼
        </button>
        <span
          title={infoTitle}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          className="cursor-help rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
        >
          ⓘ
        </span>
        <InertIcon title="Campo personalizado / cálculo (em breve)">⋮</InertIcon>
      </span>

      <span
        className={`text-[10px] uppercase tracking-wide group-hover:hidden ${
          kind === "measure" ? "text-amber-600" : "text-muted-foreground"
        }`}
      >
        {kind === "measure" ? "measure" : "dim"}
      </span>
    </Command.Item>
  );
}

function SearchOptionsPopover() {
  const [scope, setScope] = useState({
    fieldLabel: true,
    fieldDescription: false,
    groupLabel: false,
    domainLabel: false,
  });

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="text-[11px] text-primary underline decoration-dotted underline-offset-2">
          Opções de busca
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-56 space-y-2 rounded-md border border-border bg-background p-3 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Buscar por
          </p>
          {(
            [
              ["fieldLabel", "Rótulo do campo"],
              ["fieldDescription", "Descrição do campo"],
              ["groupLabel", "Rótulo do grupo"],
              ["domainLabel", "Rótulo do Domain"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={scope[key]}
                onChange={(e) => setScope((s) => ({ ...s, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * Field picker (Domains) — busca fuzzy via cmdk, Domains expansíveis com
 * badge de contagem de campos em uso, abas Todos os campos/Em uso,
 * subseções FILTER-ONLY FIELDS/DIMENSÕES/MEASURES por Domain.
 *
 * Fase 7: ícones de hover por campo — ▼ filtrar (funil) é funcional, liga/
 * desliga o campo como filtro; ⓘ info mostra tipo/descrição/nome técnico
 * via tooltip nativo; ⤢ pivot e ⋮ mais ficam inertes ("em breve") — pivot
 * em si continua fora de escopo por decisão do usuário.
 */
export function FieldPicker({
  cubes,
  selectedMeasures,
  selectedDimensions,
  onToggleMeasure,
  onToggleDimension,
  onCollapse,
  isFieldFilterActive,
  onToggleFieldFilter,
}: {
  cubes: CubeMeta[];
  selectedMeasures: string[];
  selectedDimensions: string[];
  onToggleMeasure: (name: string) => void;
  onToggleDimension: (name: string) => void;
  onCollapse?: () => void;
  isFieldFilterActive: (name: string) => boolean;
  onToggleFieldFilter: (name: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(cubes.map((c) => c.name)));
  const [search, setSearch] = useState("");

  function toggleExpanded(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function usedCount(cube: CubeMeta) {
    return (
      cube.measures.filter((m) => selectedMeasures.includes(m.name)).length +
      cube.dimensions.filter((d) => selectedDimensions.includes(d.name)).length
    );
  }

  const totalFields = cubes.reduce((sum, c) => sum + c.measures.length + c.dimensions.length, 0);

  // Aproximação simples de "N exibidos" para o rodapé — não replica com
  // exatidão o score fuzzy do cmdk, mas é suficiente pra dar a noção de
  // quantos campos o filtro atual deixou visíveis.
  const shownFields = useMemo(() => {
    const term = search.trim().toLowerCase();
    let count = 0;
    for (const cube of cubes) {
      const fields = [...cube.dimensions, ...cube.measures];
      for (const f of fields) {
        const inUseOk = tab === "all" || selectedMeasures.includes(f.name) || selectedDimensions.includes(f.name);
        const searchOk = !term || f.title.toLowerCase().includes(term) || cube.title.toLowerCase().includes(term);
        if (inUseOk && searchOk) count++;
      }
    }
    return count;
  }, [cubes, search, tab, selectedMeasures, selectedDimensions]);

  const activeDomainName = cubes[0]?.title ?? "Domain";

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-background">
      {/* header: nome do Domain + colapsar */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <span className="text-sm font-semibold">{activeDomainName}</span>
        {onCollapse && (
          <button
            onClick={onCollapse}
            title="Recolher painel"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            ‹
          </button>
        )}
      </div>

      <Command className="flex min-h-0 flex-1 flex-col" label="Buscar campo" shouldFilter>
        {/* busca */}
        <div className="space-y-1 border-b border-border px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Encontrar um campo</span>
            <SearchOptionsPopover />
          </div>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder="Comece a digitar para buscar..."
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* abas */}
        <div className="flex border-b border-border px-3">
          {(
            [
              ["all", "Todos os campos"],
              ["inUse", "Em uso"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <Command.List className="min-h-0 flex-1 overflow-y-auto p-2">
          <Command.Empty className="px-2 py-6 text-center text-sm text-muted-foreground">
            Nenhum campo encontrado.
          </Command.Empty>

          {cubes.map((cube) => {
            const used = usedCount(cube);
            const isExpanded = expanded.has(cube.name);
            const filterOnly = [...cube.dimensions, ...cube.measures].filter(isFilterOnly);
            const dims = cube.dimensions.filter((d) => !isFilterOnly(d));
            const measures = cube.measures.filter((m) => !isFilterOnly(m));

            const visibleDims = tab === "inUse" ? dims.filter((d) => selectedDimensions.includes(d.name)) : dims;
            const visibleMeasures =
              tab === "inUse" ? measures.filter((m) => selectedMeasures.includes(m.name)) : measures;

            if (tab === "inUse" && visibleDims.length === 0 && visibleMeasures.length === 0) return null;

            return (
              <div key={cube.name} className="mb-2">
                <button
                  onClick={() => toggleExpanded(cube.name)}
                  className="flex w-full items-center justify-between rounded-md bg-muted px-2 py-1.5 text-left text-sm font-semibold"
                >
                  <span>
                    {isExpanded ? "▾" : "▸"} {cube.title}
                  </span>
                  {used > 0 && <span className="text-xs text-primary">{used}</span>}
                </button>

                {isExpanded && (
                  <Command.Group>
                    {filterOnly.length > 0 && tab === "all" && (
                      <>
                        <p className="mt-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Filter-only fields
                        </p>
                        {filterOnly.map((f) => (
                          <FieldRow
                            key={f.name}
                            field={f}
                            kind={cube.dimensions.includes(f) ? "dim" : "measure"}
                            active={false}
                            searchValue={`${cube.title} ${f.title} ${f.name}`}
                            onSelect={() => {}}
                            isFilterActive={isFieldFilterActive(f.name)}
                            onToggleFilter={() => onToggleFieldFilter(f.name)}
                          />
                        ))}
                      </>
                    )}

                    {visibleDims.length > 0 && (
                      <p className="mt-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Dimensões
                      </p>
                    )}
                    {visibleDims.map((d) => (
                      <FieldRow
                        key={d.name}
                        field={d}
                        kind="dim"
                        active={selectedDimensions.includes(d.name)}
                        searchValue={`${cube.title} ${d.title} ${d.name}`}
                        onSelect={() => onToggleDimension(d.name)}
                        isFilterActive={isFieldFilterActive(d.name)}
                        onToggleFilter={() => onToggleFieldFilter(d.name)}
                      />
                    ))}

                    {visibleMeasures.length > 0 && (
                      <p className="mt-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Measures
                      </p>
                    )}
                    {visibleMeasures.map((m) => (
                      <FieldRow
                        key={m.name}
                        field={m}
                        kind="measure"
                        active={selectedMeasures.includes(m.name)}
                        searchValue={`${cube.title} ${m.title} ${m.name}`}
                        onSelect={() => onToggleMeasure(m.name)}
                        isFilterActive={isFieldFilterActive(m.name)}
                        onToggleFilter={() => onToggleFieldFilter(m.name)}
                      />
                    ))}
                  </Command.Group>
                )}
              </div>
            );
          })}

          {cubes.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Carregando Domains...
            </p>
          )}
        </Command.List>
      </Command>

      {/* rodapé */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2">
        <span className="text-[11px] text-muted-foreground">
          {totalFields} campos | {shownFields} exibidos
        </span>
        <span
          title="Em breve"
          className="cursor-default text-[11px] text-muted-foreground/70 underline decoration-dotted underline-offset-2"
        >
          Ir para camada semântica
        </span>
      </div>
    </div>
  );
}
