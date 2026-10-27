import type { NextRequest } from "next/server";
import {
  browseAll, CSV_ROW_LIMIT, DEFAULT_TABLE, getColumns, isBrowseTable, parseBrowseState,
} from "@/lib/browse";
import { csvResponse, toCsv } from "@/lib/csv";
import type { SearchParams } from "@/lib/url";

export const dynamic = "force-dynamic";

// Same URL params as /explore (t, f.<column>, sort, dir); returns every filtered row as CSV.
export async function GET(request: NextRequest) {
  const sp: SearchParams = Object.fromEntries(request.nextUrl.searchParams);
  const table = sp.t || DEFAULT_TABLE;
  if (typeof table !== "string" || !isBrowseTable(table)) {
    return new Response("Unknown table. Pick one from the list on /explore.", { status: 400 });
  }
  try {
    const columns = await getColumns(table);
    const state = parseBrowseState(sp, columns, table, 1);
    const rows = await browseAll(state, columns);
    return csvResponse(`${table}.csv`, toCsv(columns, rows), {
      "X-Row-Limit-Reached": rows.length >= CSV_ROW_LIMIT ? "true" : "false",
    });
  } catch (err) {
    console.error("csv export failed:", err instanceof Error ? err.message : err);
    return new Response("We couldn't reach the database. Refresh in a minute.", { status: 503 });
  }
}
