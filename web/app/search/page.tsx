import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/brand";
import { DatabaseError, loadOrNull } from "@/components/DatabaseError";
import { Mascot } from "@/components/Mascot";
import { OccupationList } from "@/components/OccupationList";
import { Pager } from "@/components/Pager";
import { OCCUPATION_PAGE_SIZE, searchOccupations } from "@/lib/onet";
import { pageParam, param } from "@/lib/url";

export const metadata: Metadata = { title: "Search" };
export const dynamic = "force-dynamic";

// URL state: ?q=<term>&page=<n>
export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const sp = await searchParams;
  const term = param(sp, "q").slice(0, 100);
  const page = pageParam(sp);
  const results = term ? await loadOrNull("search", () => searchOccupations(term, page)) : undefined;

  return (
    <Container className="py-10">
      <PageHeader title="Search">
        <p>Find a job by its title, another name for it, a tool it uses, or its O*NET code (like 15-1252).</p>
      </PageHeader>

      <form action="/search" method="get" role="search" className="mb-10 flex max-w-2xl flex-col gap-3 sm:flex-row">
        <label htmlFor="search-q" className="sr-only">
          Search jobs, skills or a job code
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          required
          maxLength={100}
          autoComplete="off"
          defaultValue={term}
          placeholder="Search jobs, skills or a code like 29-1141"
          className="tbg-input flex-1"
        />
        <button type="submit" className="tbg-btn tbg-btn-primary">
          Search
        </button>
      </form>

      {results === null ? <DatabaseError /> : null}

      {results && results.total === 0 ? (
        <div className="flex items-center gap-6">
          <Mascot size="md" />
          <p className="tbg-prose text-lg" role="status">
            No jobs match &ldquo;{term}&rdquo;. Try a shorter word or a job code like 15-1252.
          </p>
        </div>
      ) : null}

      {results && results.total > 0 ? (
        <section aria-label={`Jobs matching ${term}`}>
          <p className="mb-4" role="status">
            {results.total === 1 ? "1 job matches" : `${results.total} jobs match`} &ldquo;{term}&rdquo;.
          </p>
          <OccupationList rows={results.rows} />
          <Pager
            path="/search"
            params={{ q: term }}
            page={page}
            pageSize={OCCUPATION_PAGE_SIZE}
            total={results.total}
            noun="jobs"
          />
        </section>
      ) : null}
    </Container>
  );
}
