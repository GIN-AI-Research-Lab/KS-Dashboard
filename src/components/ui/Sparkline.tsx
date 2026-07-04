const VIEW_W = 100;

function hashValues(data: number[]): string {
  let h = 2166136261;
  for (let i = 0; i < data.length; i++) {
    // fold the value bits into a simple FNV-ish hash
    const v = Math.round(data[i] * 1000) ^ (i * 2654435761);
    h ^= v;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function Sparkline({
  data,
  height = 28,
  className,
  color = "var(--accent)",
}: {
  data: number[];
  height?: number;
  className?: string;
  color?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  const pad = height * 0.12;
  const usable = height - pad * 2;

  const stepX = VIEW_W / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    // when range is 0, draw a flat line through the vertical center
    const norm = range === 0 ? 0.5 : (v - min) / range;
    const y = pad + (1 - norm) * usable;
    return [x, y] as const;
  });

  const linePath = points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  const areaPath =
    `${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ")} ` +
    `${VIEW_W},${height} 0,${height}`;

  const gradientId = `spark-${hashValues(data)}-${data.length}`;

  return (
    <svg
      className={className}
      width="100%"
      height={height}
      viewBox={`0 0 ${VIEW_W} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.18} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <polyline
        points={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
