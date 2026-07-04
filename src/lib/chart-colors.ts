// Validated categorical palette (fixed order — never cycled/reassigned per
// filter) from the dataviz skill's reference palette. These light-mode hexes are
// the reference values the validator checks; at render time charts use the
// theme-aware `SERIES` CSS vars below (which resolve to these in light mode and
// to the brighter dark steps in dark mode).
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

// Theme-aware series colors: reference the CSS custom properties defined in
// globals.css so every chart follows the active [data-theme] (the vars hold the
// validated light palette in light mode and the brighter dark steps in dark).
export const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`);

// Chart chrome (axes, gridlines, tooltip surface) reads live CSS vars so it
// adapts to light/dark instead of being locked to one theme.
export const CHART_INK = {
  primary: "var(--text-primary)",
  secondary: "var(--text-secondary)",
  muted: "var(--text-muted)",
  gridline: "var(--gridline)",
  baseline: "var(--baseline)",
  surface: "var(--surface-raised)",
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
  if (idx >= 0) return SERIES[idx % SERIES.length];
  // stable hash fallback for unrecognized model ids
  let hash = 0;
  for (let i = 0; i < model.length; i++) hash = (hash * 31 + model.charCodeAt(i)) >>> 0;
  return SERIES[hash % SERIES.length];
}

export function colorForIndex(i: number) {
  return SERIES[i % SERIES.length];
}

// Server Components can't read CSS vars, so they pass a light-palette hex for a
// trend series. Map it to the matching theme-aware var so the line/area follows
// the theme too; unknown colors pass through unchanged.
const HEX_TO_VAR: Record<string, string> = {};
CATEGORICAL.forEach((hex, i) => {
  HEX_TO_VAR[hex.toLowerCase()] = SERIES[i];
});
export function themedSeries(color: string) {
  return HEX_TO_VAR[color.toLowerCase()] ?? color;
}
