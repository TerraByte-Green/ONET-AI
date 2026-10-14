# Phase 02: Repo & Supabase deploy
Goal: Code on GitHub and data loaded into the Supabase project.
## Stories
- [ ] S1: Create GitHub repo, push (decide master vs main) | Done when: remote set, initial commit pushed
- [ ] S2: Connect Supabase GitHub integration, add DATABASE_URL secret | Done when: `onet` schema exists with 38 tables + views
- [ ] S3: CI loader run (GitHub Action) | Done when: load-data workflow completes, counts match data/manifest.json
- [ ] S4: Smoke-test queries from the app | Done when: app reads onet.* via DATABASE_URL
