# Phase 01: Schema & data prep
Goal: Postgres structure for all O*NET 31.0 data plus a repeatable load path.
## Stories
- [x] S1: Profile all 45 xlsx files (columns, keys, FKs) | Done when: keys and FKs verified against data
- [x] S2: Schema migration (`onet` schema, 38 tables) | Done when: supabase/migrations/20261014000000_create_onet_schema.sql written
- [x] S3: Spreadsheet-shaped views | Done when: supabase/migrations/20261014000100_create_onet_views.sql written
- [x] S4: xlsx→CSV build with validation | Done when: scripts/build_csv.py produces data/*.csv + manifest.json (1,120,006 rows)
- [x] S5: Loader | Done when: scripts/load.py written (truncate + COPY in one transaction, row-count check)
- [x] S6: Project files | Done when: README, .env.example, requirements.txt, .gitignore written
