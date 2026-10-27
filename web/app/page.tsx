import Link from "next/link";
import { Container, PixelLabel, SectionHeading, ShadowBox } from "@/components/brand";
import { DatabaseError, loadOrNull } from "@/components/DatabaseError";
import { Mascot } from "@/components/Mascot";
import { Wave } from "@/components/Wave";
import {
  getCareerInterests, getHomeCounts, getJobZones, getReleaseInfo,
  type CareerInterest, type HomeCounts, type JobZone, type ReleaseInfo,
} from "@/lib/onet";
import { zoneLabel, zoneSummary } from "@/lib/zones";

// Live counts from the database on every request.
export const dynamic = "force-dynamic";

type HomeData = {
  release: ReleaseInfo | null;
  counts: HomeCounts;
  zones: JobZone[];
  interests: CareerInterest[];
};

function loadHomeData(): Promise<HomeData | null> {
  return loadOrNull("home data", async () => {
    const [release, counts, zones, interests] = await Promise.all([
      getReleaseInfo(), getHomeCounts(), getJobZones(), getCareerInterests(),
    ]);
    return { release, counts, zones, interests };
  });
}

const fmt = new Intl.NumberFormat("en-US");

export default async function HomePage() {
  const data = await loadHomeData();

  return (
    <>
      <section className="bg-sky" aria-labelledby="hero-title">
        <Container className="flex items-end justify-between gap-8 pb-10 pt-6 md:pt-10">
          <div className="min-w-0 flex-1">
            <h1 id="hero-title" className="mb-6 max-w-[20ch]">
              What kind of work are you curious about?
            </h1>
            <ShadowBox className="max-w-2xl">
              <form action="/search" method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
                <label htmlFor="home-search" className="sr-only">
                  Search jobs, skills or a job code
                </label>
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  required
                  autoComplete="off"
                  placeholder="Search jobs, skills or a code like 29-1141"
                  className="tbg-input flex-1"
                />
                <button type="submit" className="tbg-btn tbg-btn-primary">
                  Search
                </button>
              </form>
            </ShadowBox>
          </div>
          <Mascot size="lg" preload className="hidden shrink-0 md:block" />
        </Container>
      </section>
      <Wave />

      <Container className="py-12">
        {data ? <HomeBrowse data={data} /> : <DatabaseError />}
      </Container>
    </>
  );
}

function HomeBrowse({ data }: { data: HomeData }) {
  const { release, counts, zones, interests } = data;
  return (
    <>
      <div className="grid gap-12 md:grid-cols-3 md:gap-8">
        <section aria-labelledby="by-zone">
          <SectionHeading id="by-zone">Browse by job zone</SectionHeading>
          <p className="mb-4">How much preparation a job needs, from little to extensive.</p>
          <ul className="divide-y divide-earth border-y border-earth">
            {zones.map((z) => (
              <li key={z.job_zone}>
                <Link
                  href={`/occupations?zone=${z.job_zone}`}
                  className="flex items-center gap-3 py-3 no-underline hover:underline"
                >
                  <PixelLabel text={`ZONE ${zoneLabel(z)}`} />
                  <span>{zoneSummary(z)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="by-interest">
          <SectionHeading id="by-interest">Browse by career interest</SectionHeading>
          <p className="mb-4">Jobs grouped by the kind of work people enjoy.</p>
          <ul className="divide-y divide-earth border-y border-earth">
            {interests.map((i) => (
              <li key={i.element_id}>
                <Link
                  href={`/occupations?interest=${encodeURIComponent(i.element_id)}`}
                  className="block py-3 no-underline hover:underline"
                >
                  {i.element_name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="explore">
          <SectionHeading id="explore">Explore data</SectionHeading>
          <p className="mb-4">
            Look through the full O*NET tables, filter them, and download what you need as a CSV.
          </p>
          <Link href="/explore" className="tbg-btn tbg-btn-secondary">
            Open the data browser
          </Link>
        </section>
      </div>

      <p className="mt-12 border-t border-earth pt-4 text-sm">
        {release ? (
          <>
            O*NET {release.release}
            {release.release_name ? ` (${release.release_name})` : ""}
          </>
        ) : (
          "O*NET release not recorded"
        )}
        {" · "}
        {fmt.format(counts.occupations)} occupations · {fmt.format(counts.jobTitles)} job titles ·{" "}
        {fmt.format(counts.tasks)} task statements
      </p>
    </>
  );
}
