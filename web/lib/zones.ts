// Job zone wording shared by home, search, occupations and detail pages.

type ZoneName = { job_zone: number; name: string };

/** "Job Zone 1-2: Very Little..." -> "1-2"; "Job Zone Three: ..." -> "3". */
export function zoneLabel({ job_zone, name }: ZoneName): string {
  return /Job Zone (\d+(?:-\d+)?)/i.exec(name)?.[1] ?? String(job_zone);
}

/** "Job Zone Three: Medium Preparation Needed" -> "Medium preparation needed". */
export function zoneSummary({ name }: ZoneName): string {
  const rest = name.includes(":") ? name.slice(name.indexOf(":") + 1).trim() : name;
  return rest.charAt(0).toUpperCase() + rest.slice(1).toLowerCase();
}

/** Short plain-language gloss used on first mention of a job zone on a page. */
const ZONE_GLOSS: Record<number, string> = {
  2: "little to some preparation: high school or a few months of training",
  3: "medium preparation: some training or an associate's degree",
  4: "considerable preparation: usually a bachelor's degree",
  5: "extensive preparation: usually graduate school",
};

/** "Job zone 3 (medium preparation: some training or an associate's degree)". */
export function zoneExplained(zone: ZoneName): string {
  const gloss = ZONE_GLOSS[zone.job_zone];
  return `Job zone ${zoneLabel(zone)}${gloss ? ` (${gloss})` : ""}`;
}

/** Pixel label text for a zone number alone (job_zones rows carry no name). */
export function zonePixel(jobZone: number): `ZONE ${string}` {
  return `ZONE ${jobZone === 2 ? "1-2" : jobZone}`;
}
