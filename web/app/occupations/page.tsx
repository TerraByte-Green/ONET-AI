import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/brand";
import { DatabaseError, loadOrNull } from "@/components/DatabaseError";
import { Mascot } from "@/components/Mascot";
import { OccupationList } from "@/components/OccupationList";
import { Pager } from "@/components/Pager";
import { getCareerInterests, getJobZones, listOccupations, OCCUPATION_PAGE_SIZE } from "@/lib/onet";
import { pageParam, param } from "@/lib/url";
import { zoneExplained, zoneLabel, zoneSummary } from "@/lib/zones";

export const metadata: Metadata = { title: "Occupations" };
export const dynamic = "force-dynamic";

// URL state: ?zone=<2-5>&interest=<1.B.1.x>&page=<n>
export default async function OccupationsPage({ searchParams }: PageProps<"/occupations">) {
  const sp = await searchParams;
  const page = pageParam(sp);
  const zoneParam = Number.parseInt(param(sp, "zone"), 10);
  const interestParam = param(sp, "interest");

  const data = await loadOrNull("occupations", async () => {
    const [zones, interests] = await Promise.all([getJobZones(), getCareerInterests()]);
    const zone = zones.find((z) => z.job_zone === zoneParam) ?? null;
    const interest = interests.find((i) => i.element_id === interestParam) ?? null;
    const list = await listOccupations(
      { zone: zone?.job_zone ?? null, interest: interest?.element_id ?? null }, page);
    return { zones, interests, zone, interest, list };
  });

  return (
    <Container className="py-10">
      <PageHeader title="Occupations">
        <p>Browse every job in O*NET by how much preparation it needs or by career interest.</p>
      </PageHeader>

      {data ? (
        <div className="grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside aria-labelledby="filters-title">
            <h2 id="filters-title" className="mb-3 text-lg">Filters</h2>
            <form action="/occupations" method="get" className="flex flex-col gap-4">
              <div>
                <label htmlFor="f-zone" className="mb-1 block font-medium">Job zone</label>
                <select id="f-zone" name="zone" defaultValue={data.zone?.job_zone ?? ""} className="tbg-input">
                  <option value="">Any preparation</option>
                  {data.zones.map((z) => (
                    <option key={z.job_zone} value={z.job_zone}>
                      {zoneLabel(z)}: {zoneSummary(z)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-interest" className="mb-1 block font-medium">Strongest career interest</label>
                <select id="f-interest" name="interest" defaultValue={data.interest?.element_id ?? ""} className="tbg-input">
                  <option value="">Any interest</option>
                  {data.interests.map((i) => (
                    <option key={i.element_id} value={i.element_id}>{i.element_name}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="tbg-btn tbg-btn-primary">Show jobs</button>
              {data.zone || data.interest ? <Link href="/occupations">Clear filters</Link> : null}
            </form>
          </aside>

          <section aria-label="Jobs">
            {data.zone ? <p className="tbg-prose mb-2">{zoneExplained(data.zone)}.</p> : null}
            {data.interest ? (
              <p className="tbg-prose mb-2">
                Jobs where {data.interest.element_name} is the strongest career interest (the kind of work people in
                the job enjoy most).
              </p>
            ) : null}
            {data.list.total === 0 ? (
              <div className="flex items-center gap-6">
                <Mascot size="md" />
                <p className="tbg-prose text-lg" role="status">
                  No jobs fit these filters. Try a different job zone or career interest.
                </p>
              </div>
            ) : (
              <>
                <OccupationList rows={data.list.rows} />
                <Pager
                  path="/occupations"
                  params={{ zone: data.zone?.job_zone, interest: data.interest?.element_id }}
                  page={page}
                  pageSize={OCCUPATION_PAGE_SIZE}
                  total={data.list.total}
                  noun="jobs"
                />
              </>
            )}
          </section>
        </div>
      ) : (
        <DatabaseError />
      )}
    </Container>
  );
}
