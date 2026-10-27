// URL state helpers. Every page keeps its state in the query string so links,
// the back button and (later) the AI widget can land on the same view.

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

/** path?k=v&... dropping empty values; page 1 is left out. */
export function hrefWith(path: string, params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
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
