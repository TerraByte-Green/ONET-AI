// URL state helpers. Every page keeps its state in the query string so links,
// the back button and (later) the AI widget can land on the same view.
// Filtered search: build with filterParams() from lib/search-filters.ts, e.g.
// hrefWith("/search", filterParams(f)); param list in README "Search".

export type SearchParams = Record<string, string | string[] | undefined>;

/** First value of a query param, trimmed; "" when missing. */
export function param(sp: SearchParams, key: string): string {
  const v = sp[key];
  return ((Array.isArray(v) ? v[0] : v) ?? "").trim();
}

/** Page number from ?page=, at least 1. */
export function pageParam(sp: SearchParams): number {
  const n = Number.parseInt(param(sp, "page"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** All values of a query param, trimmed, empties dropped. */
export function params(sp: SearchParams, key: string): string[] {
  const v = sp[key];
  return (Array.isArray(v) ? v : v === undefined ? [] : [v]).map((s) => s.trim()).filter(Boolean);
}

export type HrefParams = Record<string, string | number | readonly (string | number)[] | undefined | null>;

/** path?k=v&... dropping empty values; arrays repeat the key; page 1 is left out. */
export function hrefWith(path: string, params: HrefParams): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) if (item !== "") qs.append(k, String(item));
      continue;
    }
    if (k === "page" && Number(v) === 1) continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

/** Escape LIKE wildcards so user text matches literally. */
export function likeEscape(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
