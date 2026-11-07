Phase: none active (01-05 done)
Story: none
Status: idle; phase 05 code written, not yet built or run against the DB
Next step: user runs `npm run build && npm run lint` in web/, tries /search with filters, and runs EXPLAIN ANALYZE on a multi-filter search (S6 check); fix anything that fails, then wait for new asks in STARTHERE.md.
Blockers: none
Key files: web/lib/search-filters.ts (URL state, chips), web/lib/search.ts (options cache, SQL builder), web/components/SearchFilterPanel.tsx, web/app/search/page.tsx, web/app/search/csv/route.ts, web/lib/soc.ts
Notes: user runs builds/tests; agent only writes code. Use the existing primitives (Container, PageHeader, SectionHeading, ScorePins, PixelLabel, ShadowBox) and .tbg-* classes; only brand color utilities exist (earth, sky, sun, leaf, teal, chip, purple, white). DB reads go through lib/db.ts query() with parameters. Pages that read the DB use export const dynamic = "force-dynamic". Next 16: proxy.ts not middleware.ts; searchParams is a Promise (PageProps<"/route">). hrefWith now accepts arrays (repeated keys). Env: single root .env, loaded by web/next.config.ts (loadEnvConfig) and scripts/load.py. vboxsf: ETXTBSY on Write leaves a .tmp file (mv it into place); check file sizes. git needs -c safe.directory="/media/sf_PortableGit/ONET AI".
