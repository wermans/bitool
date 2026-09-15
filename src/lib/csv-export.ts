import type { CubeQuery, CubeRow } from "@/lib/cube-types";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Mesma ordem de colunas do ResultsTable (dimensões, depois measures) —
 * pra o CSV bater com o que o usuário vê na aba Results. No caso de merge,
 * as colunas variam por linha (join de duas queries), então usamos a união
 * das chaves.
 */
export function buildCsv(data: CubeRow[], query: CubeQuery, isMerged: boolean): string {
  const columns = isMerged
    ? Array.from(new Set(data.flatMap((row) => Object.keys(row))))
    : [
        ...query.dimensions,
        ...(query.timeDimensions?.map((t) => t.dimension) ?? []),
        ...query.measures,
      ];

  const header = columns.map(csvEscape).join(",");
  const rows = data.map((row) => columns.map((c) => csvEscape(row[c])).join(","));
  return [header, ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  // BOM no início ajuda o Excel a reconhecer UTF-8 (acentos) corretamente.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
