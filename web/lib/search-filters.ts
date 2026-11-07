// Search filter state. Every filter lives in the URL (GET form, no JS needed)
// so results can be shared, paged and linked to by the AI widget.
//
// URL params:
//   q                         keyword (title, other title, technology, or code)
//   zone (repeat)             job zone number
//   group (repeat)            SOC major group, 2 digits
//   interest (repeat)         strongest career interest, element id 1.B.1.x
//   int, int_min              career interest element id + minimum OI score (1 to 7)
//   emerging=1                has emerging tasks
//   r1..r3                    rating element "<domain>:<element id>"
//   r1_im..r3_im              minimum importance (1 to 5)
//   r1_lv..r3_lv              minimum level (0 to 7)
//   edu_min, edu_max          most common required education category (1 to 12)
//   exp_min, exp_max          most common related work experience category (1 to 11)
//   ojt_min, ojt_max          most common on-the-job training category (1 to 9)
//   wc1, wc1_min, wc2, wc2_min  work context element + minimum mean (1 to 5)
//   ws1, ws1_min, ws2, ws2_min  work style element + minimum impact (-3 to 3)
//   tech                      technology name contains
//   hot=1, demand=1           uses a hot / in-demand technology
//   sort                      relevance | title | zone | zone-desc | score
//   page                      page number

import { isRatedDomain, RATED_DOMAINS, type RatedDomain } from "./onet";
import { socGroupName } from "./soc";
import { type HrefParams, param, params, type SearchParams } from "./url";
import { zoneLabel } from "./zones";

export const MAX_RATING_ROWS = 3;
export const MAX_CONTEXT_ROWS = 2;
export const MAX_STYLE_ROWS = 2;

export type FilterElement = { id: string; name: string };
export type FilterCategory = { category: number; label: string };

/** Reference lists the filters are validated against (loaded by lib/search.ts). */
export type FilterOptions = {
  zones: { job_zone: number; name: string }[];
  groups: string[];
  interests: FilterElement[];
  ratingElements: Record<RatedDomain, FilterElement[]>;
  education: FilterCategory[];
  experience: FilterCategory[];
  training: FilterCategory[];
  workContext: FilterElement[];
  workStyles: FilterElement[];
};

export type Threshold = { element: string; min: number };
export type RatingRow = { domain: RatedDomain; element: string; minImportance: number | null; minLevel: number | null };
export type Range = { min: number | null; max: number | null };

export const SORT_KEYS = ["relevance", "title", "zone", "zone-desc", "score"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type SearchFilters = {
  q: string;
  zones: number[];
  groups: string[];
  interests: string[];
  interestScore: Threshold | null;
  emerging: boolean;
  ratings: RatingRow[];
  education: Range;
  experience: Range;
  training: Range;
  workContext: Threshold[];
  workStyles: Threshold[];
  tech: string;
  hot: boolean;
  inDemand: boolean;
  sort: SortKey;
};

export const SCORE_LIMITS = {
  interest: { min: 1, max: 7 },
  importance: { min: 1, max: 5 },
  level: { min: 0, max: 7 },
  context: { min: 1, max: 5 },
  style: { min: -3, max: 3 },
} as const;

const EMPTY_RANGE: Range = { min: null, max: null };

/** Number within [lo, hi], rounded to 2 decimals; null when missing or out of range. */
function num(s: string, lo: number, hi: number): number | null {
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < lo || n > hi) return null;
  return Math.round(n * 100) / 100;
}

function hasId(list: FilterElement[], id: string): boolean {
  return list.some((e) => e.id === id);
}

function parseRange(sp: SearchParams, key: string, cats: FilterCategory[]): Range {
  const valid = (s: string) => {
    const n = Number.parseInt(s, 10);
    return cats.some((c) => c.category === n) ? n : null;
  };
  let min = valid(param(sp, `${key}_min`));
  let max = valid(param(sp, `${key}_max`));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  return { min, max };
}

function parseThresholds(
  sp: SearchParams, key: string, count: number, list: FilterElement[], lo: number, hi: number,
): Threshold[] {
  const out: Threshold[] = [];
  for (let i = 1; i <= count; i++) {
    const element = param(sp, `${key}${i}`);
    const min = num(param(sp, `${key}${i}_min`), lo, hi);
    if (hasId(list, element) && min !== null && !out.some((t) => t.element === element)) out.push({ element, min });
  }
  return out;
}

/** Read and validate filters; unknown or out-of-range values are dropped. */
export function parseFilters(sp: SearchParams, opts: FilterOptions): SearchFilters {
  const zones = [...new Set(params(sp, "zone").map(Number))].filter((z) => opts.zones.some((o) => o.job_zone === z));
  const groups = [...new Set(params(sp, "group"))].filter((g) => opts.groups.includes(g));
  const interests = [...new Set(params(sp, "interest"))].filter((i) => hasId(opts.interests, i));

  const intEl = param(sp, "int");
  const intMin = num(param(sp, "int_min"), SCORE_LIMITS.interest.min, SCORE_LIMITS.interest.max);
  const interestScore = hasId(opts.interests, intEl) && intMin !== null ? { element: intEl, min: intMin } : null;

  const ratings: RatingRow[] = [];
  for (let i = 1; i <= MAX_RATING_ROWS; i++) {
    const raw = param(sp, `r${i}`);
    const cut = raw.indexOf(":");
    const domain = raw.slice(0, cut);
    const element = raw.slice(cut + 1);
    if (cut < 1 || !isRatedDomain(domain) || !hasId(opts.ratingElements[domain], element)) continue;
    if (ratings.some((r) => r.domain === domain && r.element === element)) continue;
    ratings.push({
      domain,
      element,
      minImportance: num(param(sp, `r${i}_im`), SCORE_LIMITS.importance.min, SCORE_LIMITS.importance.max),
      minLevel: num(param(sp, `r${i}_lv`), SCORE_LIMITS.level.min, SCORE_LIMITS.level.max),
    });
  }

  const q = param(sp, "q").slice(0, 100);
  const filters: SearchFilters = {
    q,
    zones,
    groups,
    interests,
    interestScore,
    emerging: param(sp, "emerging") === "1",
    ratings,
    education: parseRange(sp, "edu", opts.education),
    experience: parseRange(sp, "exp", opts.experience),
    training: parseRange(sp, "ojt", opts.training),
    workContext: parseThresholds(sp, "wc", MAX_CONTEXT_ROWS, opts.workContext,
      SCORE_LIMITS.context.min, SCORE_LIMITS.context.max),
    workStyles: parseThresholds(sp, "ws", MAX_STYLE_ROWS, opts.workStyles,
      SCORE_LIMITS.style.min, SCORE_LIMITS.style.max),
    tech: param(sp, "tech").slice(0, 100),
    hot: param(sp, "hot") === "1",
    inDemand: param(sp, "demand") === "1",
    sort: "title",
  };
  const sort = param(sp, "sort") as SortKey;
  filters.sort = SORT_KEYS.includes(sort) && sortAllowed(filters, sort) ? sort : defaultSort(filters);
  return filters;
}

export function defaultSort(f: SearchFilters): SortKey {
  return f.q ? "relevance" : "title";
}

/** Relevance needs a keyword; score needs a rating row. */
export function sortAllowed(f: SearchFilters, sort: SortKey): boolean {
  if (sort === "relevance") return f.q !== "";
  if (sort === "score") return f.ratings.length > 0;
  return true;
}

/** True when anything beyond the keyword narrows the results. */
export function hasFilters(f: SearchFilters): boolean {
  return f.zones.length > 0 || f.groups.length > 0 || f.interests.length > 0 || f.interestScore !== null
    || f.emerging || f.ratings.length > 0 || rangeSet(f.education) || rangeSet(f.experience)
    || rangeSet(f.training) || f.workContext.length > 0 || f.workStyles.length > 0
    || f.tech !== "" || f.hot || f.inDemand;
}

function rangeSet(r: Range): boolean {
  return r.min !== null || r.max !== null;
}

/** Filters back to URL params (page left out). */
export function filterParams(f: SearchFilters): HrefParams {
  const p: HrefParams = {
    q: f.q,
    zone: f.zones,
    group: f.groups,
    interest: f.interests,
    int: f.interestScore?.element,
    int_min: f.interestScore?.min,
    emerging: f.emerging ? "1" : undefined,
    edu_min: f.education.min, edu_max: f.education.max,
    exp_min: f.experience.min, exp_max: f.experience.max,
    ojt_min: f.training.min, ojt_max: f.training.max,
    tech: f.tech,
    hot: f.hot ? "1" : undefined,
    demand: f.inDemand ? "1" : undefined,
    sort: f.sort === defaultSort(f) ? undefined : f.sort,
  };
  f.ratings.forEach((r, i) => {
    p[`r${i + 1}`] = `${r.domain}:${r.element}`;
    p[`r${i + 1}_im`] = r.minImportance;
    p[`r${i + 1}_lv`] = r.minLevel;
  });
  f.workContext.forEach((t, i) => {
    p[`wc${i + 1}`] = t.element;
    p[`wc${i + 1}_min`] = t.min;
  });
  f.workStyles.forEach((t, i) => {
    p[`ws${i + 1}`] = t.element;
    p[`ws${i + 1}_min`] = t.min;
  });
  return p;
}

// ---------------------------------------------------------------------------
// Chips: one per applied filter value, each with the params that remove it.
// ---------------------------------------------------------------------------

export type FilterChip = { label: string; params: HrefParams };

function nameOf(list: FilterElement[], id: string): string {
  return list.find((e) => e.id === id)?.name ?? id;
}

function catLabel(cats: FilterCategory[], n: number | null): string {
  return cats.find((c) => c.category === n)?.label ?? String(n);
}

function rangeLabel(title: string, r: Range, cats: FilterCategory[]): string {
  if (r.min !== null && r.max !== null) {
    return r.min === r.max
      ? `${title}: ${catLabel(cats, r.min)}`
      : `${title}: ${catLabel(cats, r.min)} to ${catLabel(cats, r.max)}`;
  }
  return r.min !== null ? `${title}: at least ${catLabel(cats, r.min)}` : `${title}: at most ${catLabel(cats, r.max)}`;
}

/** Without a value, sort falls back to the default if it is no longer allowed. */
function without(f: SearchFilters, patch: Partial<SearchFilters>): HrefParams {
  const next = { ...f, ...patch };
  if (!sortAllowed(next, next.sort)) next.sort = defaultSort(next);
  return filterParams(next);
}

export function ratingLabel(r: RatingRow, opts: FilterOptions): string {
  const name = nameOf(opts.ratingElements[r.domain], r.element);
  const parts: string[] = [];
  if (r.minImportance !== null) parts.push(`importance ${r.minImportance}+`);
  if (r.minLevel !== null) parts.push(`level ${r.minLevel}+`);
  return `${RATED_DOMAINS[r.domain].label}: ${name}${parts.length ? ` (${parts.join(", ")})` : ""}`;
}

export function filterChips(f: SearchFilters, opts: FilterOptions): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const z of f.zones) {
    const zone = opts.zones.find((o) => o.job_zone === z);
    chips.push({ label: `Job zone ${zone ? zoneLabel(zone) : z}`, params: without(f, { zones: f.zones.filter((x) => x !== z) }) });
  }
  for (const g of f.groups) {
    chips.push({ label: `Group: ${socGroupName(g)}`, params: without(f, { groups: f.groups.filter((x) => x !== g) }) });
  }
  for (const i of f.interests) {
    chips.push({
      label: `Strongest interest: ${nameOf(opts.interests, i)}`,
      params: without(f, { interests: f.interests.filter((x) => x !== i) }),
    });
  }
  if (f.interestScore) {
    chips.push({
      label: `${nameOf(opts.interests, f.interestScore.element)} interest ${f.interestScore.min}+`,
      params: without(f, { interestScore: null }),
    });
  }
  if (f.emerging) chips.push({ label: "Has emerging tasks", params: without(f, { emerging: false }) });
  f.ratings.forEach((r, idx) => {
    chips.push({ label: ratingLabel(r, opts), params: without(f, { ratings: f.ratings.filter((_, j) => j !== idx) }) });
  });
  if (rangeSet(f.education)) {
    chips.push({ label: rangeLabel("Education", f.education, opts.education), params: without(f, { education: EMPTY_RANGE }) });
  }
  if (rangeSet(f.experience)) {
    chips.push({
      label: rangeLabel("Work experience", f.experience, opts.experience),
      params: without(f, { experience: EMPTY_RANGE }),
    });
  }
  if (rangeSet(f.training)) {
    chips.push({ label: rangeLabel("On-the-job training", f.training, opts.training), params: without(f, { training: EMPTY_RANGE }) });
  }
  f.workContext.forEach((t, idx) => {
    chips.push({
      label: `${nameOf(opts.workContext, t.element)} ${t.min}+`,
      params: without(f, { workContext: f.workContext.filter((_, j) => j !== idx) }),
    });
  });
  f.workStyles.forEach((t, idx) => {
    chips.push({
      label: `${nameOf(opts.workStyles, t.element)} ${t.min}+`,
      params: without(f, { workStyles: f.workStyles.filter((_, j) => j !== idx) }),
    });
  });
  if (f.tech) chips.push({ label: `Uses technology: ${f.tech}`, params: without(f, { tech: "" }) });
  if (f.hot) chips.push({ label: "Uses a hot technology", params: without(f, { hot: false }) });
  if (f.inDemand) chips.push({ label: "Uses an in-demand technology", params: without(f, { inDemand: false }) });
  return chips;
}

/** Params that keep the keyword and drop every filter. */
export function clearFilterParams(f: SearchFilters): HrefParams {
  return { q: f.q };
}
