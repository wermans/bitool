import type { CubeRow } from "@/lib/cube-types";

/**
 * "Merged results" do Looker — combina duas queries (potencialmente de
 * cubes diferentes) numa única tabela, casando pela dimensão escolhida em
 * cada lado. É um full outer join em memória, no client — o Cube.js nunca
 * vê as duas queries como uma coisa só, cada uma roda independente.
 */
export function mergeRows(
  rowsA: CubeRow[],
  joinKeyA: string,
  rowsB: CubeRow[],
  joinKeyB: string
): CubeRow[] {
  const merged = new Map<string, CubeRow>();

  for (const row of rowsA) {
    const key = String(row[joinKeyA] ?? "");
    merged.set(key, { ...row });
  }

  for (const row of rowsB) {
    const key = String(row[joinKeyB] ?? "");
    const existing = merged.get(key);
    if (existing) {
      merged.set(key, { ...existing, ...row });
    } else {
      merged.set(key, { ...row });
    }
  }

  return Array.from(merged.values());
}
