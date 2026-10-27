import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/brand";
import { BarList } from "@/components/BarList";
import { DatabaseError, loadOrNull } from "@/components/DatabaseError";
import { DownloadCsv } from "@/components/DownloadCsv";
import { getCareerInterests, getJobZones, RATED_DOMAINS } from "@/lib/onet";
import { parseSummaryOptions, runSummary, SUMMARY_PRESETS, summaryParams, type Summary } from "@/lib/summaries";
import { hrefWith } from "@/lib/url";
import { zoneLabel, zoneSummary } from "@/lib/zones";

export const metadata: Metadata = { title: "Data summaries" };
export const dynamic = "force-dynamic";

// URL state: ?preset=<preset>&domain=<domain>&zone=<n>&interest=<1.B.1.x>
export default async function SummariesPage({ searchParams }: PageProps<"/explore/summaries">) {
  const options = parseSummaryOptions(await searchParams);
  const data = await loadOrNull("summary", async () => {
    const [summary, zones, interests] = await Promise.all([runSummary(options), getJobZones(), getCareerInterests()]);
    return { summary, zones, interests };
  });

  return (
    <Container className="py-10">
      <PageHeader title="Data summaries">
        <p>
          Totals and averages across every job in O*NET. To see the rows behind them, use the{" "}
          <Link href="/explore">data browser</Link>.
        </p>
      </PageHeader>

      <nav aria-label="Summaries" className="mb-8">
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {Object.entries(SUMMARY_PRESETS).map(([preset, label]) => (
            <li key={preset}>
              <Link
                href={hrefWith("/explore/summaries", summaryParams({ ...options, preset: preset as Summary["options"]["preset"] }))}
                aria-current={preset === options.preset ? "page" : undefined}
                className={preset === options.preset ? "tbg-highlight font-bold no-underline" : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {data ? (
        <>
          {options.preset === "top-by-zone" || options.preset === "top-by-interest" ? (
            <form action="/explore/summaries" method="get" className="mb-8 flex flex-wrap items-end gap-4">
              <input type="hidden" name="preset" value={options.preset} />
              <div>
                <label htmlFor="s-domain" className="mb-1 block font-medium">Ratings</label>
                <select id="s-domain" name="domain" defaultValue={options.domain} className="tbg-input">
                  {Object.entries(RATED_DOMAINS).map(([key, d]) => (
                    <option key={key} value={key}>{d.label}</option>
                  ))}
                </select>
              </div>
              {options.preset === "top-by-zone" ? (
                <div>
                  <label htmlFor="s-zone" className="mb-1 block font-medium">Job zone</label>
                  <select id="s-zone" name="zone" defaultValue={options.zone} className="tbg-input">
                    {data.zones.map((z) => (
                      <option key={z.job_zone} value={z.job_zone}>{zoneLabel(z)}: {zoneSummary(z)}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label htmlFor="s-interest" className="mb-1 block font-medium">Strongest career interest</label>
                  <select id="s-interest" name="interest" defaultValue={options.interest} className="tbg-input">
                    {data.interests.map((i) => (
                      <option key={i.element_id} value={i.element_id}>{i.element_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <button type="submit" className="tbg-btn tbg-btn-secondary">Show summary</button>
            </form>
          ) : null}

          <SummaryChart summary={data.summary} />
        </>
      ) : (
        <DatabaseError />
      )}
    </Container>
  );
}

function SummaryChart({ summary }: { summary: Summary }) {
  const { options, rows, kind } = summary;
  const href = (key: string) => {
    if (options.preset === "jobs-by-zone") return `/occupations?zone=${key}`;
    if (options.preset === "jobs-by-interest") return `/occupations?interest=${encodeURIComponent(key)}`;
    return undefined;
  };
  return (
    <section aria-labelledby="summary-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 id="summary-title">{summary.title}</h2>
        <DownloadCsv
          href={hrefWith("/explore/summaries/csv", summaryParams(options))}
          filename={`${options.preset}.csv`}
        />
      </div>
      <p className="tbg-prose mb-4">{summary.measure}</p>
      {rows.length ? (
        <BarList
          label={summary.title}
          min={kind === "importance" ? 1 : 0}
          max={kind === "importance" ? 5 : undefined}
          bars={rows.map((r) => ({
            label: r.label,
            value: r.value,
            shown: kind === "count" ? String(r.value) : r.value.toFixed(1),
            href: href(r.key),
          }))}
        />
      ) : (
        <p className="tbg-prose">No jobs have these ratings yet.</p>
      )}
    </section>
  );
}
