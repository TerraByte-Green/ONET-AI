export const SITE_NAME = "TerraByte Green Career Explorer";

export const NAV = [
  { href: "/search", label: "Search" },
  { href: "/occupations", label: "Occupations" },
  { href: "/compare", label: "Compare" },
  { href: "/explore", label: "Explore data" },
] as const;

export const HELP_HREF = "/help";

/** Current nav item for a path: exact match or a sub-page of it. */
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
