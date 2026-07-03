// Timeline annotations overlaid on time-series charts (e.g. the DAU trend) to
// correlate adoption changes with real events: rollout dates, trainings,
// policy changes. Admins edit this list directly.
//
// `date` must be a YYYY-MM-DD string. A marker only renders if that date lines
// up with a data point on the chart's x-axis (the charts use daily buckets).

export type Annotation = { date: string; label: string };

export const ANNOTATIONS: Annotation[] = [
  // { date: "2026-06-01", label: "Rollout công ty" },
  // { date: "2026-06-15", label: "Buổi đào tạo" },
];
