import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/brand";
import { DatabaseError, loadOrNull } from "@/components/DatabaseError";
import { DownloadCsv } from "@/components/DownloadCsv";
import { Mascot } from "@/components/Mascot";
import { OccupationList } from "@/components/OccupationList";
import { Pager } from "@/components/Pager";
import { SEARCH_FORM_ID, SearchFilterPanel } from "@/components/SearchFilterPanel";
import { OCCUPATION_PAGE_SIZE } from "@/lib/onet";
import { getFilterOptions, searchWithFilters } from "@/lib/search";
import {
  clearFilterParams, type FilterChip, filterChips, filterParams, hasFilters, parseFilters, type SortKey,
} from "@/lib/search-filters";
import { hrefWith, pageParam } from "@/lib/url";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

const fmt = new Intl.NumberFormat("en-US");

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Best match (needs a search word)",
  title: "Job title A to Z",
  zone: "Job zone, least preparation first",
  "zone-desc": "Job zone, most preparation first",
  score: "Score 1, highest first",
};

// URL state: see lib/search-filters.ts for every param.
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const page = pageParam(sp);

  const data = await loadOrNull("search", async () => {
    const opts = await getFilterOptions();
    const filters = parseFilters(sp, opts);
    const active = filters.q !== "" || hasFilters(filters);
    const results = active ? await searchWithFilters(filters, page) : null;
    return { opts, filters, results };
  });

  if (!data) {
    return (
      <Container className="py-10">
        <PageHeader title="Search" />
        <DatabaseError />
      </Container>
    );
  }

  const { opts, filters: f, results } = data;
  const params = filterParams(f);
  const chips = filterChips(f, opts);
  const scoreName = results?.score
    ? opts.ratingElements[results.score.domain].find((e) => e.id === results.score?.element)?.name ?? null
    : null;
  const subject = f.q ? <>&ldquo;{f.q}&rdquo;{chips.length ? " and your filters" : ""}</> : <>your filters</>;

  return (
    <Container className="py-10">
      <PageHeader title="Search">
        <p>
          Find a job by its title, another name for it, a tool it uses, or its O*NET code (like 15-1252). Add filters to
          narrow the list, or use filters alone.
        </p>
      </PageHeader>

      <form id={SEARCH_FORM_ID} action="/search" method="get" role="search" className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor="search-q" className="mb-1 block font-medium">Search words</label>
          <input
            id="search-q"
            name="q"
            type="search"
            maxLength={100}
            autoComplete="off"
            defaultValue={f.q}
            placeholder="Search jobs, skills or a code like 29-1141"
            className="tbg-input"
          />
        </div>
        <div>
          <label htmlFor="search-sort" className="mb-1 block font-medium">Sort by</label>
          <select id="search-sort" name="sort" defaultValue={f.sort} className="tbg-input">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABELS[k]}</option>)}
          </select>
        </div>
        <button type="submit" className="tbg-btn tbg-btn-primary">Search</button>
      </form>

      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <SearchFilterPanel filters={f} opts={opts} clearHref={hrefWith("/search", clearFilterParams(f))} />

        <section aria-label="Search results">
          <ActiveFilters chips={chips} clearHref={hrefWith("/search", clearFilterParams(f))} />

          {!results ? (
            <p className="tbg-prose text-lg">Type a search word, pick filters, or both. Then press Search.</p>
          ) : results.total === 0 ? (
            <div className="flex items-center gap-6">
              <Mascot size="md" />
              <div className="tbg-prose text-lg" role="status">
                <p>No jobs match {subject}.</p>
                <p>
                  {chips.length
                    ? "Try removing one of the filters above, or lower a minimum score."
                    : "Try a shorter word or a job code like 15-1252."}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <p role="status">
                  {results.total === 1 ? "1 job matches" : `${fmt.format(results.total)} jobs match`} {subject}.
                </p>
                <DownloadCsv href={hrefWith("/search/csv", params)} filename="onet-search.csv" />
              </div>
              <OccupationList
                rows={results.rows}
                score={results.score && scoreName ? { name: scoreName, scale: results.score.scale } : null}
              />
              <Pager
                path="/search"
                params={params}
                page={page}
                pageSize={OCCUPATION_PAGE_SIZE}
                total={results.total}
                noun="jobs"
              />
            </>
          )}
        </section>
      </div>
    </Container>
  );
}

function ActiveFilters({ chips, clearHref }: { chips: FilterChip[]; clearHref: string }) {
  if (!chips.length) return null;
  return (
    <ul aria-label="Active filters" className="mb-4 flex flex-wrap gap-2">
      {chips.map((c) => (
        <li key={c.label} className="flex items-center gap-2 rounded-md border-2 border-earth px-3 py-1">
          <span>{c.label}</span>
          <Link href={hrefWith("/search", c.params)}>
            Remove<span className="sr-only"> filter: {c.label}</span>
          </Link>
        </li>
      ))}
      <li className="flex items-center px-1">
        <Link href={clearHref}>Clear all filters</Link>
      </li>
    </ul>
  );
}
