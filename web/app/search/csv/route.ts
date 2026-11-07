import type { NextRequest } from "next/server";
import { csvResponse, toCsv } from "@/lib/csv";
import { getFilterOptions, SEARCH_CSV_LIMIT, searchAllWithFilters } from "@/lib/search";
import { hasFilters, parseFilters } from "@/lib/search-filters";
import type { SearchParams } from "@/lib/url";

export const dynamic = "force-dynamic";

// Same URL params as /search; returns every matching job (up to SEARCH_CSV_LIMIT).
export async function GET(request: NextRequest) {
  const sp: SearchParams = {};
  for (const key of new Set(request.nextUrl.searchParams.keys())) sp[key] = request.nextUrl.searchParams.getAll(key);
  try {
    const filters = parseFilters(sp, await getFilterOptions());
    if (!filters.q && !hasFilters(filters)) {
      return new Response("Add a search word or a filter first.", { status: 400 });
    }
    const result = await searchAllWithFilters(filters);
    const columns = ["onetsoc_code", "title", "job_zone", "match_kind", "matched"];
    if (result.score) columns.push(`${result.score.element}_${result.score.scale}`);
    columns.push("description");
    const rows = result.rows.map((r) => ({
      ...r,
      ...(result.score ? { [`${result.score.element}_${result.score.scale}`]: r.score } : {}),
    }));
    const headers: Record<string, string> = result.total > SEARCH_CSV_LIMIT ? { "X-Row-Limit": String(SEARCH_CSV_LIMIT) } : {};
    return csvResponse("onet-search.csv", toCsv(columns, rows), headers);
  } catch (err) {
    console.error("search csv failed:", err instanceof Error ? err.message : err);
    return new Response("We couldn't reach the database. Refresh in a minute.", { status: 503 });
  }
}
