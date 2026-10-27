import "server-only";
import { query } from "./db";
import { likeEscape } from "./url";

export type ReleaseInfo = {
  release: string;
  release_name: string | null;
  source_url: string | null;
  license: string | null;
  loaded_at: Date;
};

export async function getReleaseInfo(): Promise<ReleaseInfo | null> {
  const rows = await query<ReleaseInfo>(
    "select release, release_name, source_url, license, loaded_at from onet.release_info limit 1");
  return rows[0] ?? null;
}

export type HomeCounts = { occupations: number; jobTitles: number; tasks: number };

export async function getHomeCounts(): Promise<HomeCounts> {
  const [row] = await query<{ occupations: string; job_titles: string; tasks: string }>(
    `select (select count(*) from onet.occupation_data) as occupations,
            (select count(*) from onet.job_titles)      as job_titles,
            (select count(*) from onet.task_statements) as tasks`);
  return { occupations: Number(row.occupations), jobTitles: Number(row.job_titles), tasks: Number(row.tasks) };
}

export type JobZone = { job_zone: number; name: string };

export async function getJobZones(): Promise<JobZone[]> {
  return query<JobZone>("select job_zone, name from onet.job_zone_reference order by job_zone");
}

export type CareerInterest = { element_id: string; element_name: string };

/** The 6 career interest types (RIASEC), elements 1.B.1.a to 1.B.1.f. */
export async function getCareerInterests(): Promise<CareerInterest[]> {
  return query<CareerInterest>(
    `select element_id, element_name from onet.content_model_reference
      where element_id ~ '^1\\.B\\.1\\.[a-f]$' order by element_id`);
}

// ---------------------------------------------------------------------------
// Occupation lists (search and browse)
// ---------------------------------------------------------------------------

export type OccupationRow = {
  onetsoc_code: string;
  title: string;
  description: string;
  job_zone: number | null;
  /** Why it matched when not by title: an alternate/reported title or a technology. */
  matched: string | null;
  match_kind: "code" | "title" | "alt" | "tech" | null;
};

export type Paged<T> = { rows: T[]; total: number };

const PAGE_SIZE = 20;
export const OCCUPATION_PAGE_SIZE = PAGE_SIZE;

/** "15-1252", "151252", "15-1252.00", "15-12" -> code prefix "15-1252"... ; null if not code-like. */
export function codePrefix(term: string): string | null {
  const m = /^(\d{2})-?(\d{0,4})(?:\.(\d{0,2}))?$/.exec(term.trim());
  if (!m) return null;
  const [, major, minor, detail] = m;
  if (!minor) return `${major}-`;
  return detail !== undefined && minor.length === 4 ? `${major}-${minor}.${detail}` : `${major}-${minor}`;
}

type RankedRow = OccupationRow & { total: string };

/**
 * Search by SOC code prefix, title, alternate job titles, reported titles and
 * technology names. Ranked: code, exact title, title prefix, title contains,
 * alternate title, reported title, technology; then by title.
 */
export async function searchOccupations(term: string, page: number): Promise<Paged<OccupationRow>> {
  const code = codePrefix(term);
  const pat = `%${likeEscape(term)}%`;
  const rows = await query<RankedRow>(
    `with hits as (
       select onetsoc_code, 0 as rank, null::text as matched, 'code' as match_kind
         from onet.occupation_data where $1::text is not null and onetsoc_code like $1 || '%'
       union all
       select onetsoc_code,
              case when lower(title) = lower($2::text) then 1 when title ilike $4 || '%' then 2 else 3 end,
              null, 'title'
         from onet.occupation_data where title ilike $3
       union all
       select onetsoc_code, case when lower(job_title) = lower($2::text) then 4 else 5 end, job_title, 'alt'
         from onet.job_titles where job_title ilike $3
       union all
       select onetsoc_code, 6, reported_job_title, 'alt'
         from onet.sample_of_reported_titles where reported_job_title ilike $3
       union all
       select onetsoc_code, 7, workplace_example, 'tech'
         from onet.software_skills where workplace_example ilike $3
     ),
     best as (
       select distinct on (onetsoc_code) onetsoc_code, rank, matched, match_kind
         from hits order by onetsoc_code, rank, length(matched)
     )
     select o.onetsoc_code, o.title, o.description, jz.job_zone, b.matched, b.match_kind,
            count(*) over () as total
       from best b
       join onet.occupation_data o using (onetsoc_code)
       left join onet.job_zones jz using (onetsoc_code)
      order by b.rank, o.title
      limit $5 offset $6`,
    [code ? likeEscape(code) : null, term, pat, likeEscape(term), PAGE_SIZE, (page - 1) * PAGE_SIZE]);
  return { rows, total: Number(rows[0]?.total ?? 0) };
}

/**
 * Browse every occupation, optionally by job zone and/or strongest career
 * interest (the RIASEC type with the highest OI score for that occupation).
 */
export async function listOccupations(
  { zone, interest }: { zone: number | null; interest: string | null },
  page: number,
): Promise<Paged<OccupationRow>> {
  const rows = await query<RankedRow>(
    `with top_interest as (
       select distinct on (onetsoc_code) onetsoc_code, element_id
         from onet.career_interest_types where scale_id = 'OI'
        order by onetsoc_code, data_value desc
     )
     select o.onetsoc_code, o.title, o.description, jz.job_zone,
            null::text as matched, null::text as match_kind, count(*) over () as total
       from onet.occupation_data o
       left join onet.job_zones jz using (onetsoc_code)
       left join top_interest ti using (onetsoc_code)
      where ($1::smallint is null or jz.job_zone = $1)
        and ($2::text is null or ti.element_id = $2)
      order by o.title
      limit $3 offset $4`,
    [zone, interest, PAGE_SIZE, (page - 1) * PAGE_SIZE]);
  return { rows, total: Number(rows[0]?.total ?? 0) };
}

// ---------------------------------------------------------------------------
// Occupation detail
// ---------------------------------------------------------------------------

export type Occupation = {
  onetsoc_code: string;
  title: string;
  description: string;
  job_zone: number | null;
  job_zone_name: string | null;
  zone_education: string | null;
  zone_experience: string | null;
};

export async function getOccupation(code: string): Promise<Occupation | null> {
  const rows = await query<Occupation>(
    `select o.onetsoc_code, o.title, o.description, jz.job_zone, r.name as job_zone_name,
            r.education as zone_education, r.experience as zone_experience
       from onet.occupation_data o
       left join onet.job_zones jz using (onetsoc_code)
       left join onet.job_zone_reference r using (job_zone)
      where o.onetsoc_code = $1`,
    [code]);
  return rows[0] ?? null;
}

/** Up to `limit` alternate titles people use for this job (shown first in My Next Move). */
export async function getReportedTitles(code: string, limit = 12): Promise<string[]> {
  const rows = await query<{ reported_job_title: string }>(
    `select reported_job_title from onet.sample_of_reported_titles
      where onetsoc_code = $1
      order by shown_in_my_next_move desc, reported_job_title limit $2`,
    [code, limit]);
  return rows.map((r) => r.reported_job_title);
}

export type Task = { task: string; task_type: string | null; emerging: boolean };

/** Core tasks first, then supplemental, then emerging tasks (labeled NEW). */
export async function getTasks(code: string): Promise<Task[]> {
  return query<Task>(
    `select task, task_type, false as emerging from onet.v_task_statements where onetsoc_code = $1
     union all
     select task, null, true from onet.v_emerging_tasks where onetsoc_code = $1
     order by emerging, task_type nulls last, task`,
    [code]);
}

/** Rating domains with importance + level (or another single scale). View names are literals. */
export const RATED_DOMAINS = {
  "essential-skills": { label: "Essential skills", view: "onet.v_essential_skills" },
  "transferable-skills": { label: "Transferable skills", view: "onet.v_transferable_skills" },
  knowledge: { label: "Knowledge", view: "onet.v_knowledge" },
  abilities: { label: "Abilities", view: "onet.v_abilities" },
  "work-activities": { label: "Work activities", view: "onet.v_work_activities" },
} as const;

export type RatedDomain = keyof typeof RATED_DOMAINS;

export function isRatedDomain(s: string): s is RatedDomain {
  return Object.hasOwn(RATED_DOMAINS, s);
}

export type Rating = { element_id: string; element_name: string; importance: number; level: number | null };

/** Importance (IM) and level (LV) per element, most important first. */
export async function getRatings(domain: RatedDomain, code: string): Promise<Rating[]> {
  const view = RATED_DOMAINS[domain].view;
  const rows = await query<{ element_id: string; element_name: string; importance: string; level: string | null }>(
    `select element_id, element_name,
            max(data_value) filter (where scale_id = 'IM') as importance,
            max(data_value) filter (where scale_id = 'LV') as level
       from ${view}
      where onetsoc_code = $1 and scale_id in ('IM', 'LV')
      group by element_id, element_name
     having max(data_value) filter (where scale_id = 'IM') is not null
      order by importance desc, element_name`,
    [code]);
  return rows.map((r) => ({ ...r, importance: Number(r.importance), level: r.level === null ? null : Number(r.level) }));
}

export type SingleScore = { element_id: string; element_name: string; value: number };

/** Work context mean scores (CX, 1 to 5), highest first. */
export async function getWorkContext(code: string): Promise<SingleScore[]> {
  const rows = await query<{ element_id: string; element_name: string; value: string }>(
    `select element_id, element_name, data_value as value from onet.v_work_context
      where onetsoc_code = $1 and scale_id = 'CX' and category is null
      order by data_value desc, element_name`,
    [code]);
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

/** Work styles impact (WI, -3 to 3), highest first. */
export async function getWorkStyles(code: string): Promise<SingleScore[]> {
  const rows = await query<{ element_id: string; element_name: string; value: string }>(
    `select element_id, element_name, data_value as value from onet.v_work_styles
      where onetsoc_code = $1 and scale_id = 'WI'
      order by data_value desc, element_name`,
    [code]);
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

export type EducationShare = { category_description: string; percent: number };

/** Required level of education (RL): share of workers per level, largest first, zeros dropped. */
export async function getEducation(code: string): Promise<EducationShare[]> {
  const rows = await query<{ category_description: string; percent: string }>(
    `select category_description, data_value as percent from onet.v_education
      where onetsoc_code = $1 and scale_id = 'RL' and category is not null and data_value > 0
      order by data_value desc`,
    [code]);
  return rows.map((r) => ({ ...r, percent: Number(r.percent) }));
}

export type TechGroup = { element_name: string; examples: { name: string; hot: boolean }[] };

/** Technology used on the job, grouped by software category; hot technologies first. */
export async function getTechnology(code: string): Promise<TechGroup[]> {
  const rows = await query<{ element_name: string; workplace_example: string; hot_technology: boolean }>(
    `select element_name, workplace_example, hot_technology from onet.v_software_skills
      where onetsoc_code = $1
      order by element_name, hot_technology desc, workplace_example`,
    [code]);
  const groups = new Map<string, TechGroup>();
  for (const r of rows) {
    let g = groups.get(r.element_name);
    if (!g) groups.set(r.element_name, (g = { element_name: r.element_name, examples: [] }));
    g.examples.push({ name: r.workplace_example, hot: r.hot_technology });
  }
  return [...groups.values()];
}

export type RelatedOccupation = { related_onetsoc_code: string; related_title: string; relatedness_tier: string };

export async function getRelated(code: string, limit = 20): Promise<RelatedOccupation[]> {
  return query<RelatedOccupation>(
    `select related_onetsoc_code, related_title, relatedness_tier from onet.v_related_occupations
      where onetsoc_code = $1 order by related_index limit $2`,
    [code, limit]);
}

export type InterestScore = { element_id: string; element_name: string; value: number };

/** The 6 career interest scores (OI, 1 to 7), highest first. The top 3 are the interest code. */
export async function getInterests(code: string): Promise<InterestScore[]> {
  const rows = await query<{ element_id: string; element_name: string; value: string }>(
    `select element_id, element_name, data_value as value from onet.v_career_interest_types
      where onetsoc_code = $1 and scale_id = 'OI'
      order by data_value desc, element_id`,
    [code]);
  return rows.map((r) => ({ ...r, value: Number(r.value) }));
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

export type OccupationName = { onetsoc_code: string; title: string };

/** Titles for the given codes, in the order given; unknown codes dropped. */
export async function getOccupationNames(codes: string[]): Promise<OccupationName[]> {
  if (codes.length === 0) return [];
  const rows = await query<OccupationName>(
    "select onetsoc_code, title from onet.occupation_data where onetsoc_code = any($1)", [codes]);
  const byCode = new Map(rows.map((r) => [r.onetsoc_code, r]));
  return codes.flatMap((c) => byCode.get(c) ?? []);
}

export type CompareElement = { element_id: string; element_name: string; scores: Record<string, number> };

/**
 * Importance per element for each occupation, ordered by the highest
 * importance any of them gives the element.
 */
export async function getCompareRatings(domain: RatedDomain, codes: string[]): Promise<CompareElement[]> {
  const view = RATED_DOMAINS[domain].view;
  const rows = await query<{ element_id: string; element_name: string; onetsoc_code: string; data_value: string }>(
    `select element_id, element_name, onetsoc_code, data_value from ${view}
      where onetsoc_code = any($1) and scale_id = 'IM'`,
    [codes]);
  const byElement = new Map<string, CompareElement>();
  for (const r of rows) {
    let e = byElement.get(r.element_id);
    if (!e) byElement.set(r.element_id, (e = { element_id: r.element_id, element_name: r.element_name, scores: {} }));
    e.scores[r.onetsoc_code] = Number(r.data_value);
  }
  const top = (e: CompareElement) => Math.max(...Object.values(e.scores));
  return [...byElement.values()].sort((a, b) => top(b) - top(a) || a.element_name.localeCompare(b.element_name));
}
