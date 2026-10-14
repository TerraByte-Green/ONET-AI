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

## Setup
```bash
pip install -r requirements.txt
cp .env.example .env          # fill in DATABASE_URL (Supabase session pooler, port 5432)
```

## Deploy
1. Apply the schema (either way):
   ```bash
   supabase db push --db-url "$DATABASE_URL"        # Supabase CLI (run `supabase init` once first)
   # or
   for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
   ```
2. Load the data: `python scripts/load.py`

## Upgrading to a new O*NET release
1. Replace `onet-data/` with the new release's Excel files.
2. `python scripts/build_csv.py`. It fails if a column or file appears that isn't mapped,
   or if a name column disagrees with its reference table.
3. If the structure changed, add a new migration under `supabase/migrations/`.
4. `python scripts/load.py` replaces the loaded data; `onet.release_info` records the release.

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
