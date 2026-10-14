Phase: 02 Repo & Supabase deploy
Story: S1 Create GitHub repo, push
Status: in progress (waiting on user)
Next step: user deploys outside the VM: apply supabase/migrations/*.sql, then `python scripts/load.py`
Blockers: migrations and loader untested against a live Postgres (no DB in VM); user is testing
Key files: supabase/migrations/, scripts/build_csv.py, scripts/load.py, data/manifest.json, README.md
