import "server-only";
import { query } from "./db";
import { likeEscape, param, type SearchParams } from "./url";

// Data browser over an allowlist of onet tables and v_* views. Table and column
// names reach SQL only after matching this list or information_schema, and are
// always double-quoted; filter values are bind parameters.

export const BROWSE_TABLES = {
  "Occupations": {
    occupation_data: "Occupations",
    v_job_zones: "Job zones",
    v_job_titles: "Job titles",
    sample_of_reported_titles: "Reported job titles",
    v_related_occupations: "Related occupations",
  },
  "Ratings": {
    v_essential_skills: "Essential skills",
    v_transferable_skills: "Transferable skills",
    v_knowledge: "Knowledge",
    v_abilities: "Abilities",
    v_work_activities: "Work activities",
    v_work_context: "Work context",
    v_work_styles: "Work styles",
    v_education: "Education",
    v_training_experience: "Training and experience",
    v_career_interest_types: "Career interest types",
    v_specific_interest_areas: "Specific interest areas",
  },
  "Tasks and technology": {
    v_task_statements: "Task statements",
    v_task_ratings: "Task ratings",
    v_tasks_to_dwas: "Tasks to detailed work activities",
    v_emerging_tasks: "Emerging tasks",
    v_software_skills: "Technology skills",
    v_gwa_iwa_dwa: "Work activity hierarchy",
  },
  "Reference": {
    content_model_reference: "Content model",
    scales_reference: "Scales",
    job_zone_reference: "Job zone reference",
    level_scale_anchors: "Level scale anchors",
    task_categories: "Task categories",
    education_categories: "Education categories",
    training_experience_categories: "Training and experience categories",
    work_context_categories: "Work context categories",
    career_interest_type_keywords: "Career interest keywords",
    interests_illustrative_activities: "Interest example activities",
    interests_illustrative_occupations: "Interest example occupations",
    v_element_crosswalk: "Element crosswalks",
    survey_booklet_locations: "Survey booklet locations",
    occupation_level_metadata: "Occupation survey metadata",
  },
} as const satisfies Record<string, Record<string, string>>;

type Groups = typeof BROWSE_TABLES;
export type BrowseTable = { [G in keyof Groups]: keyof Groups[G] }[keyof Groups];

const LABELS: Record<string, string> = Object.assign({}, ...Object.values(BROWSE_TABLES));

export const DEFAULT_TABLE: BrowseTable = "occupation_data";
export const BROWSE_PAGE_SIZE = 50;
/** CSV exports stop here so one request can't hold the whole 300k-row work context table in memory. */
export const CSV_ROW_LIMIT = 100_000;

export function isBrowseTable(name: string): name is BrowseTable {
  return Object.prototype.hasOwnProperty.call(LABELS, name);
}

export function tableLabel(name: BrowseTable): string {
  return LABELS[name];
}

const columnCache = new Map<string, string[]>();

/** Column names in order, from information_schema (only ever called with an allowlisted name). */
export async function getColumns(table: BrowseTable): Promise<string[]> {
  const hit = columnCache.get(table);
  if (hit) return hit;
  const rows = await query<{ column_name: string }>(
    `select column_name from information_schema.columns
      where table_schema = 'onet' and table_name = $1 order by ordinal_position`,
    [table]);
  const cols = rows.map((r) => r.column_name);
  // Surrogate identity keys mean nothing to readers.
  const shown = cols.filter((c) => c !== "id");
  if (shown.length) columnCache.set(table, shown);
  return shown;
}

const ident = (name: string) => `"${name.replaceAll('"', '""')}"`;

export type BrowseState = {
  table: BrowseTable;
  /** Contains-filters, column -> text (case-insensitive). */
  filters: Record<string, string>;
  sort: string | null;
  dir: "asc" | "desc";
  page: number;
};

/** Read browse state from the URL: ?t=&sort=&dir=&page=&f.<column>=<text>. Unknown columns are dropped. */
export function parseBrowseState(sp: SearchParams, columns: string[], table: BrowseTable, page: number): BrowseState {
  const filters: Record<string, string> = {};
  for (const key of Object.keys(sp)) {
    if (!key.startsWith("f.")) continue;
    const col = key.slice(2);
    const value = param(sp, key).slice(0, 200);
    if (value && columns.includes(col)) filters[col] = value;
  }
  const sort = param(sp, "sort");
  return {
    table,
    filters,
    sort: columns.includes(sort) ? sort : null,
    dir: param(sp, "dir") === "desc" ? "desc" : "asc",
    page,
  };
}

/** Query-string params for a state, for links and the CSV URL. */
export function browseParams(s: BrowseState): Record<string, string | number | undefined> {
  const out: Record<string, string | number | undefined> = {
    t: s.table,
    sort: s.sort ?? undefined,
    dir: s.sort && s.dir === "desc" ? "desc" : undefined,
    page: s.page,
  };
  for (const [col, value] of Object.entries(s.filters)) out[`f.${col}`] = value;
  return out;
}

function buildSelect(s: BrowseState, columns: string[]) {
  const params: unknown[] = [];
  const where = Object.entries(s.filters).map(([col, value]) => {
    params.push(`%${likeEscape(value)}%`);
    return `${ident(col)}::text ilike $${params.length}`;
  });
  // Cast every column to text: dates stay YYYY-MM-DD, numerics keep their digits.
  const select = columns.map((c) => `${ident(c)}::text as ${ident(c)}`).join(", ");
  const from = `onet.${ident(s.table)} t${where.length ? ` where ${where.join(" and ")}` : ""}`;
  // Qualified with t. so ORDER BY uses the typed column, not the text alias.
  // A sort column first, then the leading columns so paging is stable.
  const order = [
    ...(s.sort ? [`t.${ident(s.sort)} ${s.dir} nulls last`] : []),
    ...columns.slice(0, 4).map((c) => `t.${ident(c)}`),
  ].join(", ");
  return { select, from, order, params };
}

export type BrowseResult = { columns: string[]; rows: Record<string, string | null>[]; total: number };

export async function browse(s: BrowseState, columns: string[]): Promise<BrowseResult> {
  const { select, from, order, params } = buildSelect(s, columns);
  const n = params.length;
  const [rows, [count]] = await Promise.all([
    query<Record<string, string | null>>(
      `select ${select} from ${from} order by ${order} limit $${n + 1} offset $${n + 2}`,
      [...params, BROWSE_PAGE_SIZE, (s.page - 1) * BROWSE_PAGE_SIZE]),
    query<{ total: string }>(`select count(*) as total from ${from}`, params),
  ]);
  return { columns, rows, total: Number(count.total) };
}

/** Every filtered row (up to CSV_ROW_LIMIT), same filters and order as the page. */
export async function browseAll(s: BrowseState, columns: string[]): Promise<Record<string, string | null>[]> {
  const { select, from, order, params } = buildSelect(s, columns);
  return query<Record<string, string | null>>(
    `select ${select} from ${from} order by ${order} limit $${params.length + 1}`,
    [...params, CSV_ROW_LIMIT]);
}
