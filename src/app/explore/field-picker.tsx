"use client";

import { Command } from "cmdk";

type CubeMember = { name: string; title: string };
export type CubeMeta = { name: string; title: string; measures: CubeMember[]; dimensions: CubeMember[] };

function FieldRow({
  label,
  kind,
  active,
  searchValue,
  onSelect,
}: {
  label: string;
  kind: "measure" | "dim";
  active: boolean;
  searchValue: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={searchValue}
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm data-[selected=true]:bg-muted"
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
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {kind === "measure" ? "measure" : "dim"}
      </span>
    </Command.Item>
  );
}

/**
 * Field picker com busca fuzzy (cmdk) — substitui a lista fixa de checkboxes
 * por cube. Digitar filtra measures/dimensions de todos os cubes ao mesmo
 * tempo, como a busca "Encontrar um campo" do Looker Explore.
 */
export function FieldPicker({
  cubes,
  selectedMeasures,
  selectedDimensions,
  onToggleMeasure,
  onToggleDimension,
}: {
  cubes: CubeMeta[];
  selectedMeasures: string[];
  selectedDimensions: string[];
  onToggleMeasure: (name: string) => void;
  onToggleDimension: (name: string) => void;
}) {
  return (
    <Command className="rounded-md border border-border bg-background" label="Buscar campo">
      <div className="border-b border-border px-3 py-2">
        <Command.Input
          placeholder="Buscar campo..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <Command.List className="max-h-[480px] overflow-y-auto p-2">
        <Command.Empty className="px-2 py-6 text-center text-sm text-muted-foreground">
          Nenhum campo encontrado.
        </Command.Empty>
        {cubes.map((cube) => (
          <Command.Group
            key={cube.name}
            heading={cube.title}
            className="mb-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {cube.measures.map((m) => (
              <FieldRow
                key={m.name}
                label={m.title}
                kind="measure"
                active={selectedMeasures.includes(m.name)}
                searchValue={`${cube.title} ${m.title} ${m.name}`}
                onSelect={() => onToggleMeasure(m.name)}
              />
            ))}
            {cube.dimensions.map((d) => (
              <FieldRow
                key={d.name}
                label={d.title}
                kind="dim"
                active={selectedDimensions.includes(d.name)}
                searchValue={`${cube.title} ${d.title} ${d.name}`}
                onSelect={() => onToggleDimension(d.name)}
              />
            ))}
          </Command.Group>
        ))}
        {cubes.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Carregando cubes...
          </p>
        )}
      </Command.List>
    </Command>
  );
}
