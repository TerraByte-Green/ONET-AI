Phase: 02 Repo & Supabase deploy
Story: S1 Create GitHub repo, push
Status: in progress (waiting on user)
Next step: user: supabase init + commit config.toml, connect Supabase GitHub integration (dir ".", branch main), add DATABASE_URL Actions secret, push main
Blockers: migrations, loader and workflow untested against a live DB (no DB in VM); user is testing
Key files: .github/workflows/load-data.yml, supabase/migrations/, scripts/load.py, README.md
