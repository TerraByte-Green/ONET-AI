import Link from "next/link";

export type Bar = {
  label: string;
  value: number;
  /** Printed value; defaults to one decimal. */
  shown?: string;
  href?: string;
  /** Outline instead of fill (career interests outside the top 3). */
  muted?: boolean;
};

/**
 * Horizontal bar list: Tech Teal bars on white, value printed beside each bar
 * (web/DESIGN.md Charts). Bars scale from `min` to `max`.
 */
export function BarList({ bars, min = 0, max, label }: { bars: Bar[]; min?: number; max?: number; label: string }) {
  const top = max ?? Math.max(...bars.map((b) => b.value), min + 1);
  return (
    <ol aria-label={label} className="flex flex-col gap-2">
      {bars.map((b) => {
        const width = Math.max(0, Math.min(100, ((b.value - min) / (top - min)) * 100));
        return (
          <li key={b.label} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[16rem_minmax(0,1fr)_auto]">
            <span className="truncate" title={b.label}>
              {b.href ? <Link href={b.href}>{b.label}</Link> : b.label}
            </span>
            <span className="h-4" aria-hidden="true">
              <span
                className={`block h-full ${b.muted ? "border-2 border-earth" : "bg-teal"}`}
                style={{ width: `${width}%` }}
              />
            </span>
            <span className="text-right font-medium tabular-nums">{b.shown ?? b.value.toFixed(1)}</span>
          </li>
        );
      })}
    </ol>
  );
}
