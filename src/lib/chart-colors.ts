// Validated categorical palette (fixed order — never cycled/reassigned per
// filter) from the dataviz skill's reference palette. Light-mode hex; charts
// render on a light chart surface (#fcfcfb) by default in this dashboard.
export const CATEGORICAL = [
  "#2a78d6", // blue
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
  "#e87ba4", // magenta
  "#eb6834", // orange
];

// Single-hue sequential ramp (blue), light -> dark, for magnitude encodings.
export const SEQUENTIAL_BLUE = [
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#2a78d6",
  "#1c5cab",
  "#104281",
];

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const CHART_INK = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  gridline: "#e1e0d9",
  baseline: "#c3c2b7",
  surface: "#fcfcfb",
};

// Stable model -> color assignment so a given model keeps its color across
// every chart on the dashboard, regardless of sort order or filtering.
const MODEL_COLOR_ORDER = [
  "claude-opus-4-8",
  "claude-sonnet-5",
  "claude-haiku-4-5",
  "claude-fable-5",
  "claude-opus-4-7",
  "claude-sonnet-4-6",
  "claude-opus-4-6",
  "claude-mythos-5",
];

export function colorForModel(model: string) {
  const idx = MODEL_COLOR_ORDER.indexOf(model);
  if (idx >= 0) return CATEGORICAL[idx % CATEGORICAL.length];
  // stable hash fallback for unrecognized model ids
  let hash = 0;
  for (let i = 0; i < model.length; i++) hash = (hash * 31 + model.charCodeAt(i)) >>> 0;
  return CATEGORICAL[hash % CATEGORICAL.length];
}

export function colorForIndex(i: number) {
  return CATEGORICAL[i % CATEGORICAL.length];
}
