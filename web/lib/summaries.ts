import "server-only";
import { query } from "./db";
import { getCareerInterests, getJobZones, isRatedDomain, RATED_DOMAINS, type RatedDomain } from "./onet";
import { param, type SearchParams } from "./url";
import { zoneLabel, zoneSummary } from "./zones";

// Preset group-by summaries for /explore/summaries and its CSV route.

export const SUMMARY_PRESETS = {
  "jobs-by-zone": "Jobs by job zone",
  "jobs-by-interest": "Jobs by strongest career interest",
  "top-by-zone": "Most important ratings in a job zone",
  "top-by-interest": "Most important ratings for a career interest",
} as const;

export type SummaryPreset = keyof typeof SUMMARY_PRESETS;

export function isSummaryPreset(s: string): s is SummaryPreset {
  return Object.prototype.hasOwnProperty.call(SUMMARY_PRESETS, s);
}

export type SummaryRow = { key: string; label: string; value: number; occupations: number };

export type SummaryOptions = { preset: SummaryPreset; domain: RatedDomain; zone: number; interest: string };

export type Summary = {
  options: SummaryOptions;
  title: string;
  /** Plain explanation of what the numbers are. */
  measure: string;
  /** Bars are counts (whole numbers) or mean importance (1 to 5). */
  kind: "count" | "importance";
  rows: SummaryRow[];
};

const TOP_N = 15;

/** Options from the URL with defaults: ?preset=&domain=&zone=&interest= */
export function parseSummaryOptions(sp: SearchParams): SummaryOptions {
  const preset = param(sp, "preset");
  const domain = param(sp, "domain");
  const zone = Number.parseInt(param(sp, "zone"), 10);
  return {
    preset: isSummaryPreset(preset) ? preset : "jobs-by-zone",
    domain: isRatedDomain(domain) ? domain : "essential-skills",
    zone: zone >= 2 && zone <= 5 ? zone : 3,
    interest: /^1\.B\.1\.[a-f]$/.test(param(sp, "interest")) ? param(sp, "interest") : "1.B.1.a",
  };
}

/** Query params for links and the CSV URL; only the options the preset uses. */
export function summaryParams(o: SummaryOptions): Record<string, string | number> {
  switch (o.preset) {
    case "top-by-zone": return { preset: o.preset, domain: o.domain, zone: o.zone };
    case "top-by-interest": return { preset: o.preset, domain: o.domain, interest: o.interest };
    default: return { preset: o.preset };
  }
}

type Raw = { key: string; label: string; value: string; occupations: string };

const num = (rows: Raw[]): SummaryRow[] =>
  rows.map((r) => ({ ...r, value: Number(r.value), occupations: Number(r.occupations) }));

const TOP_INTEREST = `
  top_interest as (
    select distinct on (onetsoc_code) onetsoc_code, element_id
      from onet.career_interest_types where scale_id = 'OI'
     order by onetsoc_code, data_value desc
  )`;

export async function runSummary(o: SummaryOptions): Promise<Summary> {
  const domainLabel = RATED_DOMAINS[o.domain].label;
  const view = RATED_DOMAINS[o.domain].view;

  switch (o.preset) {
    case "jobs-by-zone": {
      const zones = await getJobZones();
      const rows = await query<{ job_zone: number; n: string }>(
        "select job_zone, count(*) as n from onet.job_zones group by job_zone order by job_zone");
      return {
        options: o,
        title: SUMMARY_PRESETS[o.preset],
        measure: "Number of jobs in each job zone (how much preparation the job needs).",
        kind: "count",
        rows: zones.map((z) => {
          const n = Number(rows.find((r) => r.job_zone === z.job_zone)?.n ?? 0);
          return { key: String(z.job_zone), label: `Zone ${zoneLabel(z)}: ${zoneSummary(z)}`, value: n, occupations: n };
        }),
      };
    }
    case "jobs-by-interest": {
      const rows = await query<Raw>(
        `with ${TOP_INTEREST}
         select e.element_id as key, e.element_name as label, count(*) as value, count(*) as occupations
           from top_interest t join onet.content_model_reference e using (element_id)
          group by e.element_id, e.element_name order by value desc, label`);
      return {
        options: o,
        title: SUMMARY_PRESETS[o.preset],
        measure: "Number of jobs whose highest-rated career interest is each type.",
        kind: "count",
        rows: num(rows),
      };
    }
    case "top-by-zone": {
      const zone = (await getJobZones()).find((z) => z.job_zone === o.zone);
      const rows = await query<Raw>(
        `select r.element_id as key, r.element_name as label, avg(r.data_value) as value,
                count(distinct r.onetsoc_code) as occupations
           from ${view} r join onet.job_zones jz using (onetsoc_code)
          where jz.job_zone = $1 and r.scale_id = 'IM'
          group by r.element_id, r.element_name
          order by value desc, label limit $2`,
        [o.zone, TOP_N]);
      return {
        options: o,
        title: `Most important ${domainLabel.toLowerCase()} in job zone ${zone ? zoneLabel(zone) : o.zone}`,
        measure: `Average importance (1 to 5) across every job in the zone. Top ${TOP_N}.`,
        kind: "importance",
        rows: num(rows),
      };
    }
    case "top-by-interest": {
      const interest = (await getCareerInterests()).find((i) => i.element_id === o.interest);
      const rows = await query<Raw>(
        `with ${TOP_INTEREST}
         select r.element_id as key, r.element_name as label, avg(r.data_value) as value,
                count(distinct r.onetsoc_code) as occupations
           from ${view} r join top_interest t using (onetsoc_code)
          where t.element_id = $1 and r.scale_id = 'IM'
          group by r.element_id, r.element_name
          order by value desc, label limit $2`,
        [o.interest, TOP_N]);
      return {
        options: o,
        title: `Most important ${domainLabel.toLowerCase()} for ${interest?.element_name ?? "this interest"} jobs`,
        measure: `Average importance (1 to 5) across jobs whose strongest career interest is ${interest?.element_name ?? "this type"}. Top ${TOP_N}.`,
        kind: "importance",
        rows: num(rows),
      };
    }
  }
}
