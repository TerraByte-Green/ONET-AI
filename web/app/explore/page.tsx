import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, PageHeader } from "@/components/brand";
import { DatabaseError, loadOrNull } from "@/components/DatabaseError";
import { DownloadCsv } from "@/components/DownloadCsv";
import { Mascot } from "@/components/Mascot";
import { Pager } from "@/components/Pager";
import {
  browse, browseParams, BROWSE_PAGE_SIZE, BROWSE_TABLES, CSV_ROW_LIMIT, DEFAULT_TABLE, getColumns,
  isBrowseTable, parseBrowseState, tableLabel, type BrowseState,
} from "@/lib/browse";
import { hrefWith, pageParam, param } from "@/lib/url";

export const metadata: Metadata = { title: "Explore data" };
export const dynamic = "force-dynamic";

const fmt = new Intl.NumberFormat("en-US");

// URL state: ?t=<table>&f.<column>=<text>...&sort=<column>&dir=desc&page=<n>
// The filter form submits fcol + fq, which are folded into f.<column> by a redirect.
export default async function ExplorePage({ searchParams }: PageProps<"/explore">) {
  const sp = await searchParams;
  const requested = param(sp, "t") || DEFAULT_TABLE;

  if (!isBrowseTable(requested)) {
    return (
      <Container className="py-10">
        <ExploreHeader />
        <div className="flex items-center gap-6">
          <Mascot size="md" />
          <p className="tbg-prose text-lg" role="alert">
            We don&rsquo;t have a table called &ldquo;{requested.slice(0, 60)}&rdquo;.{" "}
            <Link href="/explore">Pick one from the list</Link>.
          </p>
        </div>
      </Container>
    );
  }

  const columns = await loadOrNull("browse columns", () => getColumns(requested));
  if (!columns) {
    return (
      <Container className="py-10">
        <ExploreHeader />
        <DatabaseError />
      </Container>
    );
  }

  const state = parseBrowseState(sp, columns, requested, pageParam(sp));
  const fcol = param(sp, "fcol");
  const fq = param(sp, "fq").slice(0, 200);
  if (fcol || "fq" in sp) {
    const filters = { ...state.filters };
    if (columns.includes(fcol) && fq) filters[fcol] = fq;
    redirect(hrefWith("/explore", browseParams({ ...state, filters, page: 1 })));
  }

  const result = await loadOrNull("browse rows", () => browse(state, columns));

  return (
    <Container className="py-10">
      <ExploreHeader />
      <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="flex flex-col gap-8" aria-label="Table and filters">
          <TablePicker table={state.table} />
          <FilterForm state={state} columns={columns} />
        </aside>

        <section aria-labelledby="table-title" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 id="table-title">{tableLabel(state.table)}</h2>
            <DownloadCsv
              href={hrefWith("/explore/csv", { ...browseParams(state), page: undefined })}
              filename={`${state.table}.csv`}
            />
          </div>
          <ActiveFilters state={state} />
          {result ? <DataTable state={state} result={result} /> : <DatabaseError />}
        </section>
      </div>
    </Container>
  );
}

function ExploreHeader() {
  return (
    <PageHeader title="Explore data">
      <p>
        Look through the O*NET tables, filter and sort them, and download a CSV. For ready-made totals, see{" "}
        <Link href="/explore/summaries">data summaries</Link>.
      </p>
    </PageHeader>
  );
}

function TablePicker({ table }: { table: string }) {
  return (
    <form action="/explore" method="get" className="flex flex-col gap-2">
      <label htmlFor="pick-table" className="font-medium">Table</label>
      <select id="pick-table" name="t" defaultValue={table} className="tbg-input">
        {Object.entries(BROWSE_TABLES).map(([group, tables]) => (
          <optgroup key={group} label={group}>
            {Object.entries(tables).map(([name, label]) => (
              <option key={name} value={name}>{label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <button type="submit" className="tbg-btn tbg-btn-secondary">Open table</button>
    </form>
  );
}

function FilterForm({ state, columns }: { state: BrowseState; columns: string[] }) {
  return (
    <form action="/explore" method="get" className="flex flex-col gap-2">
      <input type="hidden" name="t" value={state.table} />
      {state.sort ? <input type="hidden" name="sort" value={state.sort} /> : null}
      {state.sort && state.dir === "desc" ? <input type="hidden" name="dir" value="desc" /> : null}
      {Object.entries(state.filters).map(([col, value]) => (
        <input key={col} type="hidden" name={`f.${col}`} value={value} />
      ))}
      <label htmlFor="filter-col" className="font-medium">Filter column</label>
      <select id="filter-col" name="fcol" defaultValue={columns.includes("title") ? "title" : columns[0]} className="tbg-input">
        {columns.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <label htmlFor="filter-q" className="font-medium">Contains</label>
      <input id="filter-q" name="fq" type="text" maxLength={200} autoComplete="off" className="tbg-input" />
      <button type="submit" className="tbg-btn tbg-btn-secondary">Add filter</button>
    </form>
  );
}

function ActiveFilters({ state }: { state: BrowseState }) {
  const entries = Object.entries(state.filters);
  if (!entries.length) return null;
  return (
    <ul aria-label="Active filters" className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
      {entries.map(([col, value]) => {
        const rest = Object.fromEntries(entries.filter(([c]) => c !== col));
        return (
          <li key={col}>
            <span className="font-medium">{col}</span> contains &ldquo;{value}&rdquo;{" "}
            <Link href={hrefWith("/explore", browseParams({ ...state, filters: rest, page: 1 }))}>
              Remove<span className="sr-only"> filter on {col}</span>
            </Link>
          </li>
        );
      })}
      <li>
        <Link href={hrefWith("/explore", browseParams({ ...state, filters: {}, page: 1 }))}>Clear all filters</Link>
      </li>
    </ul>
  );
}

function DataTable({ state, result }: {
  state: BrowseState;
  result: { columns: string[]; rows: Record<string, string | null>[]; total: number };
}) {
  const { columns, rows, total } = result;
  if (total === 0) {
    return (
      <div className="flex items-center gap-6">
        <Mascot size="md" />
        <p className="tbg-prose text-lg" role="status">No rows match these filters. Remove one to see more.</p>
      </div>
    );
  }
  const sortHref = (col: string) => {
    const dir = state.sort === col && state.dir === "asc" ? "desc" : "asc";
    return hrefWith("/explore", browseParams({ ...state, sort: col, dir, page: 1 }));
  };
  return (
    <>
      {total > CSV_ROW_LIMIT ? (
        <p className="mb-3 text-sm">
          The CSV holds the first {fmt.format(CSV_ROW_LIMIT)} of {fmt.format(total)} rows. Add a filter to get the rest.
        </p>
      ) : null}
      <div className="tbg-table-wrap" tabIndex={0} role="region" aria-labelledby="table-title">
        <table className="tbg-table">
          <thead>
            <tr>
              {columns.map((c) => {
                const sorted = state.sort === c;
                return (
                  <th
                    key={c}
                    scope="col"
                    aria-sort={sorted ? (state.dir === "asc" ? "ascending" : "descending") : undefined}
                  >
                    <Link href={sortHref(c)} className="no-underline hover:underline">
                      {c}
                      {sorted ? (state.dir === "asc" ? " ▲" : " ▼") : ""}
                      <span className="sr-only">, sort {sorted && state.dir === "asc" ? "descending" : "ascending"}</span>
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c} className={c === "onetsoc_code" ? "whitespace-nowrap tabular-nums" : undefined}>
                    {c === "onetsoc_code" && r[c] ? <Link href={`/occupations/${r[c]}`}>{r[c]}</Link> : r[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager
        path="/explore"
        params={browseParams({ ...state, page: 1 })}
        page={state.page}
        pageSize={BROWSE_PAGE_SIZE}
        total={total}
        noun="rows"
      />
    </>
  );
}
