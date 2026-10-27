import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { ReactNode } from "react";
import { Container, PageHeader, PixelLabel, ScorePins, SectionHeading, SCALES } from "@/components/brand";
import { BarList } from "@/components/BarList";
import { DatabaseError, loadOrNull } from "@/components/DatabaseError";
import {
  getEducation, getInterests, getOccupation, getRatings, getRelated, getReportedTitles, getTasks,
  getTechnology, getWorkContext, getWorkStyles, RATED_DOMAINS,
  type Rating, type RatedDomain, type SingleScore,
} from "@/lib/onet";
import { zoneExplained, zonePixel } from "@/lib/zones";

export const dynamic = "force-dynamic";

const CODE = /^\d{2}-\d{4}\.\d{2}$/;
const SHOWN = 10;

/** "29-1141" -> "29-1141.00"; anything else not shaped like a code -> null. */
function normalizeCode(raw: string): string | null {
  const code = raw.trim();
  if (CODE.test(code)) return code;
  return /^\d{2}-\d{4}$/.test(code) ? `${code}.00` : null;
}

export async function generateMetadata({ params }: PageProps<"/occupations/[code]">): Promise<Metadata> {
  const code = normalizeCode((await params).code);
  const occ = code ? await loadOrNull("occupation title", () => getOccupation(code)) : null;
  return { title: occ ? occ.title : "Occupation" };
}

const RATED_SECTIONS: { domain: RatedDomain; id: string; noun: string }[] = [
  { domain: "essential-skills", id: "essential-skills", noun: "essential skills" },
  { domain: "transferable-skills", id: "transferable-skills", noun: "transferable skills" },
  { domain: "knowledge", id: "knowledge", noun: "knowledge areas" },
  { domain: "abilities", id: "abilities", noun: "abilities" },
  { domain: "work-activities", id: "work-activities", noun: "work activities" },
];

async function loadDetail(code: string) {
  const occ = await getOccupation(code);
  if (!occ) return "missing" as const;
  const [titles, tasks, ratings, context, styles, education, tech, related, interests] = await Promise.all([
    getReportedTitles(code),
    getTasks(code),
    Promise.all(RATED_SECTIONS.map((s) => getRatings(s.domain, code))),
    getWorkContext(code),
    getWorkStyles(code),
    getEducation(code),
    getTechnology(code),
    getRelated(code),
    getInterests(code),
  ]);
  return { occ, titles, tasks, ratings, context, styles, education, tech, related, interests };
}

// URL: /occupations/<O*NET-SOC code>, sections addressable by #id.
export default async function OccupationPage({ params }: PageProps<"/occupations/[code]">) {
  const raw = (await params).code;
  const code = normalizeCode(raw);
  if (!code) notFound();
  if (code !== raw) permanentRedirect(`/occupations/${code}`);

  const d = await loadOrNull("occupation detail", () => loadDetail(code));
  if (d === null) {
    return (
      <Container className="py-10">
        <DatabaseError />
      </Container>
    );
  }
  if (d === "missing") notFound();
  const { occ } = d;

  const sections: { id: string; title: string; body: ReactNode }[] = [
    { id: "summary", title: "Summary", body: <Summary description={occ.description} titles={d.titles} /> },
    { id: "tasks", title: "Tasks", body: <Tasks tasks={d.tasks} /> },
    ...RATED_SECTIONS.map((s, i) => ({
      id: s.id,
      title: RATED_DOMAINS[s.domain].label,
      body: <RatingList rows={d.ratings[i]} noun={s.noun} />,
    })),
    {
      id: "work-context",
      title: "Work context",
      body: (
        <SingleList
          rows={d.context}
          scale="context"
          noun="work conditions"
          intro="The physical and social conditions of the job, rated 1 to 5 (higher means more of it)."
        />
      ),
    },
    {
      id: "work-styles",
      title: "Work styles",
      body: (
        <SingleList
          rows={d.styles}
          scale="impact"
          noun="work styles"
          intro="Personal traits that help or hurt on this job, rated from -3 (works against you) to 3 (helps a lot)."
        />
      ),
    },
    { id: "education", title: "Education", body: <Education rows={d.education} /> },
    { id: "technology", title: "Technology", body: <Technology groups={d.tech} /> },
    { id: "interests", title: "Career interests", body: <Interests rows={d.interests} /> },
    { id: "related", title: "Related occupations", body: <Related rows={d.related} /> },
  ];

  return (
    <Container className="py-10">
      <PageHeader title={occ.title}>
        <p className="flex flex-wrap items-center gap-3">
          <span className="tabular-nums">O*NET code {occ.onetsoc_code}</span>
          {occ.job_zone ? <PixelLabel text={zonePixel(occ.job_zone)} /> : null}
        </p>
        {occ.job_zone && occ.job_zone_name ? (
          <p className="mt-2">
            {zoneExplained({ job_zone: occ.job_zone, name: occ.job_zone_name })}. {occ.zone_education}
          </p>
        ) : null}
        <p className="mt-4">
          <Link href={`/compare?codes=${occ.onetsoc_code}`} className="tbg-btn tbg-btn-secondary">
            Compare with other jobs
          </Link>
        </p>
      </PageHeader>

      <div className="grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-6 flex flex-col gap-1 text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex min-w-0 flex-col gap-12">
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id} className="scroll-mt-6">
              <SectionHeading id={s.id}>{s.title}</SectionHeading>
              {s.body}
            </section>
          ))}
        </div>
      </div>
    </Container>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="tbg-prose">{children}</p>;
}

/** First SHOWN items, the rest behind "Show all". */
function MoreList<T>({ items, noun, render, keyOf }: {
  items: T[];
  noun: string;
  render: (item: T) => ReactNode;
  keyOf: (item: T) => string;
}) {
  const first = items.slice(0, SHOWN);
  const rest = items.slice(SHOWN);
  const list = (rows: T[]) => (
    <ul className="divide-y divide-earth border-y border-earth">
      {rows.map((r) => <li key={keyOf(r)} className="py-3">{render(r)}</li>)}
    </ul>
  );
  return (
    <>
      {list(first)}
      {rest.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer font-medium underline">Show all {items.length} {noun}</summary>
          <div className="mt-0">{list(rest)}</div>
        </details>
      ) : null}
    </>
  );
}

function Summary({ description, titles }: { description: string; titles: string[] }) {
  return (
    <div className="tbg-prose">
      <p>{description}</p>
      {titles.length ? <p className="mt-3"><span className="font-medium">Also called:</span> {titles.join(", ")}.</p> : null}
    </div>
  );
}

function Tasks({ tasks }: { tasks: { task: string; task_type: string | null; emerging: boolean }[] }) {
  if (!tasks.length) return <Empty>O*NET has no task list for this job yet.</Empty>;
  return (
    <>
      {tasks.some((t) => t.emerging) ? (
        <p className="tbg-prose mb-3">
          Tasks marked <PixelLabel text="NEW" /> are emerging: new or changing work O*NET has recently seen in this job.
        </p>
      ) : null}
      <MoreList
        items={tasks}
        noun="tasks"
        keyOf={(t) => `${t.emerging}-${t.task}`}
        render={(t) => (
          <p className="tbg-prose">
            {t.emerging ? <><PixelLabel text="NEW" />{" "}</> : null}
            {t.task}
            {t.task_type === "Supplemental" ? <span className="text-sm"> (supplemental)</span> : null}
          </p>
        )}
      />
    </>
  );
}

function RatingList({ rows, noun }: { rows: Rating[]; noun: string }) {
  if (!rows.length) return <Empty>O*NET has no {noun} ratings for this job yet.</Empty>;
  return (
    <>
      <p className="tbg-prose mb-3">
        Importance is rated {SCALES.importance.min} to {SCALES.importance.max}; level (how much skill the job needs)
        is rated {SCALES.level.min} to {SCALES.level.max}.
      </p>
      <MoreList
        items={rows}
        noun={noun}
        keyOf={(r) => r.element_id}
        render={(r) => (
          <div className="grid gap-2 md:grid-cols-[14rem_minmax(0,1fr)] md:items-center">
            <span className="font-medium">{r.element_name}</span>
            <div className="flex flex-col gap-1">
              <ScorePins scale="importance" value={r.importance} />
              {r.level !== null ? <ScorePins scale="level" value={r.level} /> : null}
            </div>
          </div>
        )}
      />
    </>
  );
}

function SingleList({ rows, scale, noun, intro }: {
  rows: SingleScore[];
  scale: "context" | "impact";
  noun: string;
  intro: string;
}) {
  if (!rows.length) return <Empty>O*NET has no {noun} ratings for this job yet.</Empty>;
  return (
    <>
      <p className="tbg-prose mb-3">{intro}</p>
      <MoreList
        items={rows}
        noun={noun}
        keyOf={(r) => r.element_id}
        render={(r) => (
          <div className="grid gap-2 md:grid-cols-[14rem_minmax(0,1fr)] md:items-center">
            <span className="font-medium">{r.element_name}</span>
            <ScorePins scale={scale} value={r.value} />
          </div>
        )}
      />
    </>
  );
}

function Education({ rows }: { rows: { category_description: string; percent: number }[] }) {
  if (!rows.length) return <Empty>O*NET has no education survey for this job yet.</Empty>;
  return (
    <>
      <p className="tbg-prose mb-3">What education people working in this job say it requires (share of workers).</p>
      <BarList
        label="Required education, share of workers"
        max={100}
        bars={rows.map((r) => ({ label: r.category_description, value: r.percent, shown: `${Math.round(r.percent)}%` }))}
      />
    </>
  );
}

function Technology({ groups }: { groups: { element_name: string; examples: { name: string; hot: boolean }[] }[] }) {
  if (!groups.length) return <Empty>O*NET lists no technology for this job yet.</Empty>;
  return (
    <>
      <p className="tbg-prose mb-3">Software and tools used on the job. Names in bold show up often in job postings.</p>
      <MoreList
        items={groups}
        noun="technology types"
        keyOf={(g) => g.element_name}
        render={(g) => (
          <p className="tbg-prose">
            <span className="font-medium">{g.element_name}:</span>{" "}
            {g.examples.map((e, i) => (
              <span key={e.name}>
                {i ? ", " : ""}
                {e.hot ? <strong>{e.name}</strong> : e.name}
              </span>
            ))}
          </p>
        )}
      />
    </>
  );
}

function Interests({ rows }: { rows: { element_id: string; element_name: string; value: number }[] }) {
  if (!rows.length) return <Empty>O*NET has no career interest scores for this job yet.</Empty>;
  const code = rows.slice(0, 3).map((r) => r.element_name).join(", ");
  return (
    <>
      <p className="tbg-prose mb-3">
        The kinds of work people in this job enjoy, rated 1 to 7. The top 3 ({code}) make up the job&rsquo;s interest
        code and are filled in.
      </p>
      <BarList
        label="Career interests, ranked"
        min={1}
        max={7}
        bars={rows.map((r, i) => ({
          label: r.element_name,
          value: r.value,
          muted: i >= 3,
          href: `/occupations?interest=${encodeURIComponent(r.element_id)}`,
        }))}
      />
    </>
  );
}

function Related({ rows }: { rows: { related_onetsoc_code: string; related_title: string }[] }) {
  if (!rows.length) return <Empty>O*NET lists no related jobs for this one yet.</Empty>;
  return (
    <ul className="divide-y divide-earth border-y border-earth">
      {rows.map((r) => (
        <li key={r.related_onetsoc_code} className="flex flex-wrap items-baseline gap-x-3 py-2">
          <Link href={`/occupations/${r.related_onetsoc_code}`}>{r.related_title}</Link>
          <span className="text-sm tabular-nums">{r.related_onetsoc_code}</span>
        </li>
      ))}
    </ul>
  );
}
