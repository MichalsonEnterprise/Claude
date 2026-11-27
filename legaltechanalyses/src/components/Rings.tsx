/** Concentric ring pattern used as a subtle background on dark sections. */
export function Rings({ cx, cy, from, to, step, ry = 1, className = "" }: { cx: number; cy: number; from: number; to: number; step: number; ry?: number; className?: string }) {
  const radii: number[] = [];
  for (let r = from; r < to; r += step) radii.push(r);
  return (
    <svg
      viewBox="0 0 1440 1200"
      preserveAspectRatio="xMidYMin slice"
      className={`pointer-events-none absolute inset-0 size-full ${className}`}
      aria-hidden="true"
    >
      <g fill="none" stroke="#193E2A" strokeOpacity=".75">
        {radii.map((r) => (
          <ellipse key={r} cx={cx} cy={cy} rx={r} ry={r * ry} />
        ))}
      </g>
    </svg>
  );
}
