// Paleta categórica validada (skill "dataviz" — ver references/palette.md):
// ordem fixa, nunca ciclada, checada contra os seis critérios de segurança
// para daltonismo/contraste. Não reordenar nem misturar com outras fontes de
// cor sem rodar validate_palette.js de novo.
export const CATEGORICAL_PALETTE = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];

// Rampa sequencial de um único matiz (magnitude contínua) — usada em
// gauge/heatmap-like, nunca para identidade categórica.
export const SEQUENTIAL_BLUE = [
  "#cde2fb",
  "#b7d3f6",
  "#9ec5f4",
  "#86b6ef",
  "#6da7ec",
  "#5598e7",
  "#3987e5",
  "#2a78d6",
  "#256abf",
  "#1c5cab",
  "#184f95",
  "#104281",
  "#0d366b",
];

export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
};
