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
cp .env.example .env          # fill in DATABASE_URL and DATABASE_PASSWORD
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
3. GitHub repo → Settings → Secrets and variables → Actions → Secrets → add:
   - `DATABASE_URL`: Supabase **session pooler** string (port 5432) with the password removed,
     e.g. `postgresql://postgres.<ref>@aws-0-<region>.pooler.supabase.com:5432/postgres`
   - `DATABASE_PASSWORD`: the database password exactly as set (no encoding needed)
4. Push to `main`.

Apply migrations only through the integration. Running them by hand skips Supabase's migration
history and breaks later deploys.

Manual load from your own machine: put `DATABASE_URL` and `DATABASE_PASSWORD` in `.env`, then run `python scripts/load.py`.

## Upgrading to a new O*NET release
1. Replace `onet-data/` with the new release's Excel files.
2. `python scripts/build_csv.py`. It fails if a column or file appears that isn't mapped,
   or if a name column disagrees with its reference table.
3. If the structure changed, add a new migration under `supabase/migrations/`.
4. Commit and push; CI reloads the data. `onet.release_info` records the release.

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
