import type { NextRequest } from "next/server";
import { csvResponse, toCsv } from "@/lib/csv";
import { parseSummaryOptions, runSummary } from "@/lib/summaries";

export const dynamic = "force-dynamic";

// Same URL params as /explore/summaries; returns the chart's rows as CSV.
export async function GET(request: NextRequest) {
  const options = parseSummaryOptions(Object.fromEntries(request.nextUrl.searchParams));
  try {
    const summary = await runSummary(options);
    const valueColumn = summary.kind === "count" ? "jobs" : "mean_importance";
    const rows = summary.rows.map((r) => ({
      key: r.key,
      label: r.label,
      [valueColumn]: summary.kind === "count" ? r.value : r.value.toFixed(3),
      occupations: r.occupations,
    }));
    const columns = summary.kind === "count" ? ["key", "label", "jobs"] : ["key", "label", valueColumn, "occupations"];
    return csvResponse(`${options.preset}.csv`, toCsv(columns, rows));
  } catch (err) {
    console.error("summary csv failed:", err instanceof Error ? err.message : err);
    return new Response("We couldn't reach the database. Refresh in a minute.", { status: 503 });
  }
}
