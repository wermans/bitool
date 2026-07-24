import type { CubeFilter, CubeQueryFilter } from "@/lib/cube-types";

export type FilterLogic = "and" | "or";

export type UiFilter = CubeFilter & { id: string };
export type FilterGroup = { id: string; logic: FilterLogic; filters: UiFilter[] };
export type FilterState = { logic: FilterLogic; groups: FilterGroup[] };

let counter = 0;
function newId(): string {
  counter += 1;
  return `f${Date.now().toString(36)}${counter}`;
}

export function newFilter(): UiFilter {
  return { id: newId(), member: "", operator: "equals", values: [] };
}

export function newGroup(): FilterGroup {
  return { id: newId(), logic: "and", filters: [newFilter()] };
}

export function emptyFilterState(): FilterState {
  return { logic: "and", groups: [] };
}

/**
 * Aceita tanto o formato antigo (array plano de CubeFilter, salvo antes dos
 * grupos AND/OR existirem) quanto o novo FilterState — usado ao carregar
 * `Dashboard.filters` do banco, que é um JSON solto sem garantia de forma.
 */
export function normalizeFilterState(raw: unknown): FilterState {
  if (!raw) return emptyFilterState();

  if (Array.isArray(raw)) {
    const filters = (raw as Partial<CubeFilter>[])
      .filter((f): f is CubeFilter => typeof f?.member === "string" && Array.isArray(f.values))
      .map((f) => ({ ...f, id: newId() }));
    if (filters.length === 0) return emptyFilterState();
    return { logic: "and", groups: [{ id: newId(), logic: "and", filters }] };
  }

  const obj = raw as { logic?: string; groups?: Partial<FilterGroup>[] };
  if (Array.isArray(obj.groups)) {
    return {
      logic: obj.logic === "or" ? "or" : "and",
      groups: obj.groups.map((g) => ({
        id: g.id || newId(),
        logic: g.logic === "or" ? "or" : "and",
        filters: (g.filters ?? []).map((f) => ({ ...f, id: f.id || newId() })),
      })),
    };
  }

  return emptyFilterState();
}

/**
 * Converte para o formato nativo de filtros do Cube.js — grupos com 1 filtro
 * válido viram o filtro simples direto (sem embrulhar em and/or à toa);
 * filtros incompletos (sem member ou sem values) são descartados.
 */
export function toCubeFilters(state: FilterState): CubeQueryFilter[] {
  const groupExprs = state.groups
    .map((g): CubeQueryFilter | null => {
      const valid = g.filters.filter((f) => f.member && f.values.length > 0);
      if (valid.length === 0) return null;
      const plain: CubeFilter[] = valid.map(({ id: _id, ...rest }) => rest);
      if (plain.length === 1) return plain[0];
      return { [g.logic]: plain } as CubeQueryFilter;
    })
    .filter((x): x is CubeQueryFilter => x !== null);

  if (groupExprs.length === 0) return [];
  if (groupExprs.length === 1) return [groupExprs[0]];
  return [{ [state.logic]: groupExprs } as CubeQueryFilter];
}

/**
 * Todos os filtros válidos de fora de um grupo, achatados — usado para
 * restringir as sugestões de valor no dropdown em cascata. Aproximação
 * conservadora: trata todo filtro ativo como restrição, independente da
 * lógica AND/OR exata da árvore (suficiente para "quais valores ainda fazem
 * sentido dado o resto", sem precisar reimplementar o avaliador de árvore).
 */
export function flattenOtherGroups(state: FilterState, excludeGroupId: string): CubeFilter[] {
  return state.groups
    .filter((g) => g.id !== excludeGroupId)
    .flatMap((g) => g.filters.filter((f) => f.member && f.values.length > 0))
    .map(({ id: _id, ...rest }) => rest);
}
