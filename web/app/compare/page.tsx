import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container, PageHeader, ScorePins, SectionHeading } from "@/components/brand";
import { DatabaseError, loadOrNull } from "@/components/DatabaseError";
import {
  getCompareRatings, getOccupationNames, isRatedDomain, RATED_DOMAINS, searchOccupations,
  type CompareElement, type OccupationName, type RatedDomain,
} from "@/lib/onet";
import { hrefWith, param } from "@/lib/url";

export const metadata: Metadata = { title: "Compare" };
export const dynamic = "force-dynamic";

const MAX_JOBS = 5;
const SHOWN = 15;
const ADD_RESULTS = 8;

type View = "pins" | "paired";

type CompareState = { codes: string[]; domain: RatedDomain; view: View; q: string };

function parseCodes(raw: string): string[] {
  const codes = raw.split(",").map((c) => c.trim()).filter((c) => /^\d{2}-\d{4}\.\d{2}$/.test(c));
  return [...new Set(codes)].slice(0, MAX_JOBS);
}

function compareHref(s: CompareState, change: Partial<CompareState> = {}): string {
  const n = { ...s, ...change };
  return hrefWith("/compare", {
    codes: n.codes.join(","),
    domain: n.domain === "essential-skills" ? undefined : n.domain,
    view: n.view === "paired" && n.codes.length === 2 ? "paired" : undefined,
    q: n.q,
  });
}

// URL state: ?codes=<code>,<code>...&domain=<domain>&view=paired&q=<search to add a job>
export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const sp = await searchParams;
  const domainParam = param(sp, "domain");
  const state: CompareState = {
    codes: parseCodes(param(sp, "codes")),
    domain: isRatedDomain(domainParam) ? domainParam : "essential-skills",
    view: param(sp, "view") === "paired" ? "paired" : "pins",
    q: param(sp, "q").slice(0, 100),
  };

  const data = await loadOrNull("compare", async () => {
    const jobs = await getOccupationNames(state.codes);
    const codes = jobs.map((j) => j.onetsoc_code);
    const [elements, found] = await Promise.all([
      codes.length >= 2 ? getCompareRatings(state.domain, codes) : Promise.resolve([]),
      state.q && codes.length < MAX_JOBS ? searchOccupations(state.q, 1) : Promise.resolve(null),
    ]);
    return { jobs, elements, found };
  });

  return (
    <Container className="py-10">
      <PageHeader title="Compare jobs">
        <p>Pick 2 to {MAX_JOBS} jobs and see their skills, knowledge and abilities side by side.</p>
      </PageHeader>
      {data ? <CompareBody state={{ ...state, codes: data.jobs.map((j) => j.onetsoc_code) }} {...data} /> : <DatabaseError />}
    </Container>
  );
}

function CompareBody({ state, jobs, elements, found }: {
  state: CompareState;
  jobs: OccupationName[];
  elements: CompareElement[];
  found: CompareBodyFound;
}) {
  const view: View = state.view === "paired" && jobs.length === 2 ? "paired" : "pins";
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="picked">
        <SectionHeading id="picked">Your jobs ({jobs.length} of {MAX_JOBS})</SectionHeading>
        {jobs.length ? (
          <ul className="mb-6 divide-y divide-earth border-y border-earth">
            {jobs.map((j) => (
              <li key={j.onetsoc_code} className="flex flex-wrap items-baseline gap-x-3 py-2">
                <Link href={`/occupations/${j.onetsoc_code}`}>{j.title}</Link>
                <span className="text-sm tabular-nums">{j.onetsoc_code}</span>
                <Link
                  href={compareHref(state, { codes: state.codes.filter((c) => c !== j.onetsoc_code) })}
                  className="ml-auto text-sm"
                >
                  Remove<span className="sr-only"> {j.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="tbg-prose mb-6">No jobs picked yet. Search for one below to add it.</p>
        )}

        {jobs.length < MAX_JOBS ? <AddJob state={state} found={found} /> : (
          <p className="tbg-prose">That&rsquo;s {MAX_JOBS} jobs, the most you can compare. Remove one to add another.</p>
        )}
      </section>

      {jobs.length >= 2 ? (
        <section aria-labelledby="results">
          <SectionHeading id="results">{RATED_DOMAINS[state.domain].label}</SectionHeading>
          <form action="/compare" method="get" className="mb-6 flex flex-wrap items-end gap-4">
            <input type="hidden" name="codes" value={state.codes.join(",")} />
            <div>
              <label htmlFor="c-domain" className="mb-1 block font-medium">Compare on</label>
              <select id="c-domain" name="domain" defaultValue={state.domain} className="tbg-input">
                {Object.entries(RATED_DOMAINS).map(([key, d]) => (
                  <option key={key} value={key}>{d.label}</option>
                ))}
              </select>
            </div>
            {jobs.length === 2 ? (
              <div>
                <label htmlFor="c-view" className="mb-1 block font-medium">Show as</label>
                <select id="c-view" name="view" defaultValue={view} className="tbg-input">
                  <option value="pins">Score pins</option>
                  <option value="paired">Paired bars</option>
                </select>
              </div>
            ) : null}
            <button type="submit" className="tbg-btn tbg-btn-primary">Compare {jobs.length} jobs</button>
          </form>
          <p className="tbg-prose mb-4">
            Importance of each item to the job, rated 1 to 5. Items are ordered by the highest score any of these jobs
            gives them.
          </p>
          {elements.length ? (
            <MoreElements elements={elements} render={(e) =>
              view === "paired" ? <PairedRow element={e} jobs={jobs} /> : <PinRows element={e} jobs={jobs} />} />
          ) : (
            <p className="tbg-prose">O*NET has no {RATED_DOMAINS[state.domain].label.toLowerCase()} ratings for these jobs yet.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}

function AddJob({ state, found }: { state: CompareState; found: CompareBodyFound }) {
  const options = found?.rows.filter((r) => !state.codes.includes(r.onetsoc_code)).slice(0, ADD_RESULTS) ?? [];
  return (
    <div>
      <form action="/compare" method="get" role="search" className="flex max-w-2xl flex-col gap-3 sm:flex-row">
        <input type="hidden" name="codes" value={state.codes.join(",")} />
        {state.domain !== "essential-skills" ? <input type="hidden" name="domain" value={state.domain} /> : null}
        <label htmlFor="c-q" className="sr-only">Find a job to add</label>
        <input
          id="c-q"
          name="q"
          type="search"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={state.q}
          placeholder="Find a job to add, like nurse or 15-1252"
          className="tbg-input flex-1"
        />
        <button type="submit" className="tbg-btn tbg-btn-secondary">Find job</button>
      </form>
      {found && state.q ? (
        options.length ? (
          <ul className="mt-4 divide-y divide-earth border-y border-earth" aria-label={`Jobs matching ${state.q}`}>
            {options.map((o) => (
              <li key={o.onetsoc_code} className="flex flex-wrap items-baseline gap-x-3 py-2">
                <span>{o.title}</span>
                <span className="text-sm tabular-nums">{o.onetsoc_code}</span>
                <Link
                  href={compareHref(state, { codes: [...state.codes, o.onetsoc_code], q: "" })}
                  className="ml-auto"
                >
                  Add<span className="sr-only"> {o.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 tbg-prose" role="status">
            No jobs match &ldquo;{state.q}&rdquo;. Try a shorter word or a job code like 15-1252.
          </p>
        )
      ) : null}
    </div>
  );
}

type CompareBodyFound = Awaited<ReturnType<typeof searchOccupations>> | null;

function MoreElements({ elements, render }: { elements: CompareElement[]; render: (e: CompareElement) => ReactNode }) {
  const list = (rows: CompareElement[]) => (
    <ul className="divide-y divide-earth border-y border-earth">
      {rows.map((e) => (
        <li key={e.element_id} className="py-3">
          <h3 className="mb-2 text-base">{e.element_name}</h3>
          {render(e)}
        </li>
      ))}
    </ul>
  );
  const rest = elements.slice(SHOWN);
  return (
    <>
      {list(elements.slice(0, SHOWN))}
      {rest.length ? (
        <details className="mt-3">
          <summary className="cursor-pointer font-medium underline">Show all {elements.length} items</summary>
          {list(rest)}
        </details>
      ) : null}
    </>
  );
}

/** Small multiples: one pin row per job, same scale, so color never tells jobs apart. */
function PinRows({ element, jobs }: { element: CompareElement; jobs: OccupationName[] }) {
  return (
    <div className="flex flex-col gap-1">
      {jobs.map((j) => {
        const v = element.scores[j.onetsoc_code];
        return v === undefined ? (
          <p key={j.onetsoc_code} className="text-sm">{j.title}: not rated</p>
        ) : (
          <ScorePins key={j.onetsoc_code} scale="importance" value={v} name={j.title} />
        );
      })}
    </div>
  );
}

const PAIR_COLORS = ["bg-teal", "bg-purple"] as const;

/** Exactly 2 jobs: Tech Teal and Deep Purple bars, each labeled directly with the job and value. */
function PairedRow({ element, jobs }: { element: CompareElement; jobs: OccupationName[] }) {
  return (
    <div className="flex flex-col gap-1">
      {jobs.map((j, i) => {
        const v = element.scores[j.onetsoc_code];
        const width = v === undefined ? 0 : ((v - 1) / 4) * 100;
        return (
          <div key={j.onetsoc_code} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[14rem_minmax(0,1fr)_auto]">
            <span className="truncate text-sm" title={j.title}>{j.title}</span>
            <span className="h-4" aria-hidden="true">
              <span className={`block h-full ${PAIR_COLORS[i]}`} style={{ width: `${width}%` }} />
            </span>
            <span className="font-medium tabular-nums">
              {v === undefined ? "not rated" : v.toFixed(1)}
              <span className="sr-only"> out of 5</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
