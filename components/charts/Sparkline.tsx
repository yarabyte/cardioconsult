export function Sparkline({
  points,
  color = "#0B4FB3",
  ariaLabel,
}: {
  points: number[];
  color?: string;
  ariaLabel: string;
}) {
  const w = 120;
  const h = 34;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * (w - 4) + 2;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} role="img" aria-label={ariaLabel}>
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
