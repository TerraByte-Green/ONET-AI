Phase: none active (01-04 done)
Story: none
Status: idle
Next step: wait for new asks in STARTHERE.md (likely the AI widget: ask for O*NET data / navigate the app from every page), then plan phase 05.
Blockers: none
Key files: planning/README.md, STARTHERE.md, web/components/AiWidgetShell.tsx (widget shell from phase 03), web/lib/url.ts (deep-link state for widget navigation)
Notes: user runs builds/tests; agent only writes code. Use the existing primitives (Container, PageHeader, SectionHeading, ScorePins, PixelLabel, ShadowBox) and .tbg-* classes; only brand color utilities exist (earth, sky, sun, leaf, teal, chip, purple, white). DB reads go through lib/db.ts query() with parameters. Pages that read the DB use export const dynamic = "force-dynamic". Next 16: proxy.ts not middleware.ts; searchParams is a Promise (PageProps<"/route">). Env: single root .env, loaded by web/next.config.ts (loadEnvConfig) and scripts/load.py. vboxsf: ETXTBSY on Write leaves a .tmp file (mv it into place); check file sizes. git needs -c safe.directory="/media/sf_PortableGit/ONET AI".
