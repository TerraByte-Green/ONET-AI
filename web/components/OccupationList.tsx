import Link from "next/link";
import { PixelLabel, ScorePins } from "./brand";
import type { OccupationRow } from "@/lib/onet";
import { zonePixel } from "@/lib/zones";

/** Trim a description to about one sentence for list rows. */
function blurb(text: string, max = 180): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

const MATCH_PREFIX = { alt: "Also called", tech: "Uses" } as const;

/** Optional score per row (search with a rating filter), shown as pins. */
export type RowScore = { name: string; scale: "importance" | "level" };

/** Occupations as a ruled list (no card grid): title, code, zone, short description. */
export function OccupationList({ rows, score }: {
  rows: (OccupationRow & { score?: number | null })[];
  score?: RowScore | null;
}) {
  return (
    <ol className="divide-y divide-earth border-y border-earth">
      {rows.map((o) => (
        <li key={o.onetsoc_code} className="py-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg">
              <Link href={`/occupations/${o.onetsoc_code}`}>{o.title}</Link>
            </h2>
            <span className="text-sm tabular-nums">{o.onetsoc_code}</span>
            {o.job_zone ? (
              <PixelLabel text={zonePixel(o.job_zone)} title="Job zone: how much preparation the job needs" />
            ) : null}
          </div>
          {o.matched && (o.match_kind === "alt" || o.match_kind === "tech") ? (
            <p className="mt-1 text-sm">
              {MATCH_PREFIX[o.match_kind]}: <mark className="tbg-highlight bg-transparent text-earth">{o.matched}</mark>
            </p>
          ) : null}
          {score && o.score !== null && o.score !== undefined ? (
            <div className="mt-2">
              <p className="text-sm font-medium">{score.name}</p>
              <ScorePins scale={score.scale} value={o.score} />
            </div>
          ) : null}
          <p className="tbg-prose mt-1">{blurb(o.description)}</p>
        </li>
      ))}
    </ol>
  );
}
