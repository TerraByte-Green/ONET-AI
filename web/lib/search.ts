import "server-only";
import { query } from "./db";
import {
  getCareerInterests, getJobZones, keywordBestCte, keywordParams, OCCUPATION_PAGE_SIZE,
  type OccupationRow, type Paged, type RatedDomain,
} from "./onet";
import type { FilterCategory, FilterElement, FilterOptions, Range, SearchFilters, SortKey } from "./search-filters";
import { likeEscape } from "./url";

/** Base tables for rating thresholds. Literals only, never user input. */
const RATING_TABLES: Record<RatedDomain, string> = {
  "essential-skills": "onet.essential_skills",
  "transferable-skills": "onet.transferable_skills",
  knowledge: "onet.knowledge",
  abilities: "onet.abilities",
  "work-activities": "onet.work_activities",
};

/** CSV exports stop here (there are about 1,000 occupations, so this is all of them). */
export const SEARCH_CSV_LIMIT = 2_000;

// ---------------------------------------------------------------------------
// Filter options (reference data; cached per process for an hour)
// ---------------------------------------------------------------------------

const OPTIONS_TTL_MS = 60 * 60 * 1000;
const optionsCache = globalThis as unknown as { searchOptions?: { at: number; value: Promise<FilterOptions> } };

/** "First Professional Degree - awarded for ..." -> "First Professional Degree". */
function shortLabel(s: string): string {
  return s.split(" - ")[0].trim();
}

async function categories(table: "education" | "training", element: string, scale: string): Promise<FilterCategory[]> {
  const from = table === "education" ? "onet.education_categories" : "onet.training_experience_categories";
  const rows = await query<{ category: number; category_description: string }>(
    `select category, category_description from ${from}
      where element_id = $1 and scale_id = $2 order by category`,
    [element, scale]);
  return rows.map((r) => ({ category: Number(r.category), label: shortLabel(r.category_description) }));
}

/** Elements that have at least one row in `table` on `scale`, by name. */
async function elementsIn(table: string, scale: string, extra = ""): Promise<FilterElement[]> {
  return query<FilterElement>(
    `select e.element_id as id, e.element_name as name from onet.content_model_reference e
      where exists (select 1 from ${table} t where t.element_id = e.element_id and t.scale_id = $1 ${extra})
      order by e.element_name`,
    [scale]);
}

async function loadOptions(): Promise<FilterOptions> {
  const domains = Object.keys(RATING_TABLES) as RatedDomain[];
  const [zones, interests, groups, education, experience, training, workContext, workStyles, ratingLists] =
    await Promise.all([
      getJobZones(),
      getCareerInterests(),
      query<{ code: string }>("select distinct left(onetsoc_code, 2) as code from onet.occupation_data order by 1"),
      categories("education", "2.D.1", "RL"),
      categories("training", "3.A.1", "RW"),
      categories("training", "3.A.3", "OJ"),
      elementsIn("onet.work_context", "CX", "and t.category is null"),
      elementsIn("onet.work_styles", "WI"),
      Promise.all(domains.map((d) => elementsIn(RATING_TABLES[d], "IM"))),
    ]);
  return {
    zones,
    groups: groups.map((g) => g.code),
    interests: interests.map((i) => ({ id: i.element_id, name: i.element_name })),
    ratingElements: Object.fromEntries(domains.map((d, i) => [d, ratingLists[i]])) as Record<RatedDomain, FilterElement[]>,
    education,
    experience,
    training,
    workContext,
    workStyles,
  };
}

export function getFilterOptions(): Promise<FilterOptions> {
  const hit = optionsCache.searchOptions;
  if (hit && Date.now() - hit.at < OPTIONS_TTL_MS) return hit.value;
  const value = loadOptions();
  optionsCache.searchOptions = { at: Date.now(), value };
  value.catch(() => {
    if (optionsCache.searchOptions?.value === value) optionsCache.searchOptions = undefined;
  });
  return value;
}

// ---------------------------------------------------------------------------
// Filtered search
// ---------------------------------------------------------------------------

export type SearchRow = OccupationRow & { score: number | null };
export type SearchResult = Paged<SearchRow> & {
  /** Which score the rows carry: the first rating row's importance or level. */
  score: { domain: RatedDomain; element: string; scale: "importance" | "level" } | null;
};

const ORDER: Record<SortKey, string> = {
  relevance: "b.rank, o.title, o.onetsoc_code",
  title: "o.title, o.onetsoc_code",
  zone: "jz.job_zone nulls last, o.title, o.onetsoc_code",
  "zone-desc": "jz.job_zone desc nulls last, o.title, o.onetsoc_code",
  score: "score desc nulls last, o.title, o.onetsoc_code",
};

/** Most common category of one education/training element for the occupation. */
function modal(table: "onet.education" | "onet.training_experience", element: string, scale: string): string {
  return `(select t.category from ${table} t
            where t.onetsoc_code = o.onetsoc_code and t.element_id = '${element}' and t.scale_id = '${scale}'
              and t.category is not null
            order by t.data_value desc, t.category limit 1)`;
}

function buildSearch(f: SearchFilters): { sql: string; args: unknown[]; score: SearchResult["score"] } {
  const args: unknown[] = f.q ? keywordParams(f.q) : [];
  const add = (v: unknown) => `$${args.push(v)}`;
  const conds: string[] = [];

  if (f.zones.length) conds.push(`jz.job_zone = any(${add(f.zones)}::smallint[])`);
  if (f.groups.length) conds.push(`left(o.onetsoc_code, 2) = any(${add(f.groups)}::text[])`);
  if (f.interests.length) {
    conds.push(`(select c.element_id from onet.career_interest_types c
                  where c.onetsoc_code = o.onetsoc_code and c.scale_id = 'OI'
                  order by c.data_value desc, c.element_id limit 1) = any(${add(f.interests)}::text[])`);
  }
  if (f.interestScore) {
    conds.push(`exists (select 1 from onet.career_interest_types c
                  where c.onetsoc_code = o.onetsoc_code and c.scale_id = 'OI'
                    and c.element_id = ${add(f.interestScore.element)}::text
                    and c.data_value >= ${add(f.interestScore.min)}::numeric)`);
  }
  if (f.emerging) conds.push("exists (select 1 from onet.emerging_tasks e where e.onetsoc_code = o.onetsoc_code)");

  for (const r of f.ratings) {
    const table = RATING_TABLES[r.domain];
    for (const [scale, min] of [["IM", r.minImportance], ["LV", r.minLevel]] as const) {
      if (min === null) continue;
      conds.push(`exists (select 1 from ${table} t
                    where t.onetsoc_code = o.onetsoc_code and t.element_id = ${add(r.element)}::text
                      and t.scale_id = '${scale}' and t.data_value >= ${add(min)}::numeric)`);
    }
  }

  const range = (expr: string, r: Range) => {
    if (r.min !== null && r.max !== null) conds.push(`${expr} between ${add(r.min)}::smallint and ${add(r.max)}::smallint`);
    else if (r.min !== null) conds.push(`${expr} >= ${add(r.min)}::smallint`);
    else if (r.max !== null) conds.push(`${expr} <= ${add(r.max)}::smallint`);
  };
  range(modal("onet.education", "2.D.1", "RL"), f.education);
  range(modal("onet.training_experience", "3.A.1", "RW"), f.experience);
  range(modal("onet.training_experience", "3.A.3", "OJ"), f.training);

  for (const t of f.workContext) {
    conds.push(`exists (select 1 from onet.work_context w
                  where w.onetsoc_code = o.onetsoc_code and w.element_id = ${add(t.element)}::text
                    and w.scale_id = 'CX' and w.category is null and w.data_value >= ${add(t.min)}::numeric)`);
  }
  for (const t of f.workStyles) {
    conds.push(`exists (select 1 from onet.work_styles w
                  where w.onetsoc_code = o.onetsoc_code and w.element_id = ${add(t.element)}::text
                    and w.scale_id = 'WI' and w.data_value >= ${add(t.min)}::numeric)`);
  }

  if (f.tech || f.hot || f.inDemand) {
    const sub = ["s.onetsoc_code = o.onetsoc_code"];
    if (f.tech) sub.push(`s.workplace_example ilike ${add(`%${likeEscape(f.tech)}%`)}`);
    if (f.hot) sub.push("s.hot_technology");
    if (f.inDemand) sub.push("s.in_demand");
    conds.push(`exists (select 1 from onet.software_skills s where ${sub.join(" and ")})`);
  }

  // Score column: first rating row, on level when only a level minimum is set.
  const first = f.ratings[0];
  let scoreSql = "null::numeric";
  let score: SearchResult["score"] = null;
  if (first) {
    const byLevel = first.minImportance === null && first.minLevel !== null;
    scoreSql = `(select t.data_value from ${RATING_TABLES[first.domain]} t
                  where t.onetsoc_code = o.onetsoc_code and t.element_id = ${add(first.element)}::text
                    and t.scale_id = '${byLevel ? "LV" : "IM"}')`;
    score = { domain: first.domain, element: first.element, scale: byLevel ? "level" : "importance" };
  }

  const sql = `${f.q ? `with ${keywordBestCte(1)}` : ""}
     select o.onetsoc_code, o.title, o.description, jz.job_zone,
            ${f.q ? "b.matched, b.match_kind" : "null::text as matched, null::text as match_kind"},
            ${scoreSql} as score,
            count(*) over () as total
       from ${f.q ? "best b join onet.occupation_data o using (onetsoc_code)" : "onet.occupation_data o"}
       left join onet.job_zones jz on jz.onetsoc_code = o.onetsoc_code
      where ${conds.length ? conds.join("\n        and ") : "true"}
      order by ${ORDER[f.sort]}`;
  return { sql, args, score };
}

type RawRow = Omit<SearchRow, "score"> & { score: string | null; total: string };

async function run(f: SearchFilters, limit: number, offset: number): Promise<SearchResult> {
  const { sql, args, score } = buildSearch(f);
  const rows = await query<RawRow>(`${sql}\n limit $${args.length + 1} offset $${args.length + 2}`, [...args, limit, offset]);
  return {
    rows: rows.map((r) => ({ ...r, score: r.score === null ? null : Number(r.score) })),
    total: Number(rows[0]?.total ?? 0),
    score,
  };
}

/** One page of occupations matching the keyword (optional) and every filter. */
export function searchWithFilters(f: SearchFilters, page: number): Promise<SearchResult> {
  return run(f, OCCUPATION_PAGE_SIZE, (page - 1) * OCCUPATION_PAGE_SIZE);
}

/** Every matching occupation (up to SEARCH_CSV_LIMIT) for CSV export. */
export function searchAllWithFilters(f: SearchFilters): Promise<SearchResult> {
  return run(f, SEARCH_CSV_LIMIT, 0);
}
