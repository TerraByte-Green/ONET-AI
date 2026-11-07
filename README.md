# ONET AI — O*NET database for Supabase

Postgres schema and loader for the [O*NET 31.0 database](https://www.onetcenter.org/database.html)
(August 2026 release), hosted on Supabase in a dedicated `onet` schema. The application
connects directly with a connection string; the schema is not exposed through the Supabase Data API.

## Layout
- `onet-data/` — original O*NET Excel files (source of truth)
- `scripts/build_csv.py` — converts and validates `onet-data/*.xlsx` → `data/*.csv` + `data/manifest.json`
- `data/` — load-ready CSVs, one per table (committed)
- `supabase/migrations/` — schema (tables, keys, indexes) and `v_*` spreadsheet-shaped views
- `scripts/load.py` — truncates and reloads every `onet` table from `data/` in one transaction
- `.github/workflows/load-data.yml` — runs the loader on push to `main`

## Setup
```bash
pip install -r requirements.txt
cp .env.example .env          # fill in DATABASE_URL
```

## Deploy (GitHub → Supabase)
Pushing to `main` deploys everything:
- **Schema:** the Supabase GitHub integration applies new files in `supabase/migrations/`.
- **Data:** `.github/workflows/load-data.yml` checks `data/` against `onet-data/`, waits for the
  migrations to land, then runs `scripts/load.py`. It also has a manual **Run workflow** button.

One-time setup:
1. Run `supabase init` in the repo and commit `supabase/config.toml`.
2. Supabase dashboard → Project Settings → Integrations → GitHub: connect this repo,
   Supabase directory `.`, production branch `main`, enable **Deploy to production**.
3. GitHub repo → Settings → Secrets and variables → Actions → Secrets → add `DATABASE_URL`:
   the Supabase **session pooler** string (port 5432) with your password pasted in as-is.
   (Optional: `DATABASE_PASSWORD` secret overrides the password in the URL.)
4. Push to `main`.

Apply migrations only through the integration. Running them by hand skips Supabase's migration
history and breaks later deploys.

Manual load from your own machine: put `DATABASE_URL` in `.env`, then run `python scripts/load.py`.

## Upgrading to a new O*NET release
1. Replace `onet-data/` with the new release's Excel files.
2. `python scripts/build_csv.py`. It fails if a column or file appears that isn't mapped,
   or if a name column disagrees with its reference table.
3. If the structure changed, add a new migration under `supabase/migrations/`.
4. Commit and push; CI reloads the data. `onet.release_info` records the release.

## Web app (TerraByte Green Career Explorer)
Next.js (App Router, TypeScript, Tailwind) in `web/`. Design rules: `web/DESIGN.md`.
Database reads are server-only (`web/lib/db.ts`) and use the same `DATABASE_URL` /
`DATABASE_PASSWORD` as the loader.

```bash
cd web
npm install --no-bin-links     # --no-bin-links needed on VirtualBox shared folders
npm run dev                    # http://localhost:3000; reads DATABASE_URL from web/.env.local
npm run build && npm run lint && npm run check:colors
```

- `/api/health`: returns the loaded O*NET release from `onet.release_info` (503 if the DB is unreachable).
- `/styleguide`: brand primitives, development only (404 in production).
- `npm run check:colors`: fails if a hex color appears outside `web/app/tokens.css`.

**Search (`/search`):** keyword and filters can be used together or alone. Every filter is a URL
param, so a search can be shared or linked to (the AI widget uses the same URLs). All filters must
match. `/search/csv` takes the same params and returns every matching job as CSV.

| Param | Filter |
|---|---|
| `q` | Keyword: title, other job title, technology, or O*NET-SOC code |
| `zone` (repeat) | Job zone number |
| `group` (repeat) | SOC major group, 2 digits (`15` = Computer and Mathematical) |
| `interest` (repeat) | Strongest career interest, element id `1.B.1.a` to `1.B.1.f` |
| `int`, `int_min` | Career interest element id and minimum OI score (1 to 7) |
| `emerging=1` | Has emerging tasks |
| `r1`..`r3`, `rN_im`, `rN_lv` | `<domain>:<element id>` with minimum importance (1 to 5) and/or level (0 to 7). Domains: `essential-skills`, `transferable-skills`, `knowledge`, `abilities`, `work-activities` |
| `edu_min`, `edu_max` | Most common required education category (1 to 12) |
| `exp_min`, `exp_max` | Most common related work experience category (1 to 11) |
| `ojt_min`, `ojt_max` | Most common on-the-job training category (1 to 9) |
| `wc1`, `wc1_min`, `wc2`, `wc2_min` | Work context element id and minimum mean (1 to 5) |
| `ws1`, `ws1_min`, `ws2`, `ws2_min` | Work style element id and minimum impact (-3 to 3) |
| `tech` | Technology name contains |
| `hot=1`, `demand=1` | Uses a hot / in-demand technology (combined with `tech` when both are set) |
| `sort` | `relevance` (needs `q`), `title`, `zone`, `zone-desc`, `score` (by `r1`) |
| `page` | Page number |

Example: `/search?zone=4&r1=knowledge:2.C.3.a&r1_im=4&sort=score`. Invalid values are dropped.
Parsing and validation: `web/lib/search-filters.ts`. Query: `web/lib/search.ts`.

Environment variables:

| Name | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Supabase session pooler URL (see `.env.example`) |
| `DATABASE_PASSWORD` | no | Raw password, if left out of the URL |
| `DATABASE_CA_CERT` | no | Supabase CA certificate (PEM). Without it, TLS is used but the server certificate isn't verified |
| `AUTH_ENABLED` | no | `true` turns on the auth hook. Default `false` (no login yet) |

**Auth hook:** `web/proxy.ts` (Next 16's name for `middleware.ts`) sends every page and API request
through `authCheck()` in `web/lib/auth.ts`. It lets everything through today. Supabase Auth gets
added there and nowhere else, behind `AUTH_ENABLED`.

**Deploy (Render):** `render.yaml` defines one free Node web service rooted at `web/`, with Node
pinned to 24.18.0. In Render choose **New → Blueprint**, pick this repo, and enter
`DATABASE_URL` (and `DATABASE_PASSWORD` if used) when prompted. Render checks `/api/health`.

## Schema notes
- Reference tables: `occupation_data`, `content_model_reference` (every element, with
  `parent_element_id`), `scales_reference`, `*_categories`, `job_zone_reference`, `iwa_reference`, `dwa_reference`.
- Data tables store IDs and values only. Use `onet.v_<table>` for the familiar spreadsheet columns
  (titles, element names, scale names, category descriptions).
- The nine "X to Y" mapping files are one table: `element_crosswalk` (`crosswalk` column names the file).
- `Date` (MM/YYYY) → `date_updated` (first of month). Y/N → boolean. `Job Titles` sources → `text[]`.

## License
O*NET data is licensed CC BY 4.0 by the U.S. Department of Labor, Employment and Training
Administration. See https://www.onetcenter.org/license_db.html.
