# Phase 04: Data pages
Goal: Search, detail, browse and aggregate O*NET data through the GUI, built on web/DESIGN.md and the phase 03 primitives.
## Stories
- [x] S1: Occupation search (title, alternate/reported titles, SOC code), paginated list with rules (no card grid); mascot empty state with DESIGN.md copy | Done when: "nurse" and "15-1252" return expected occupations; no-match state shows the guidance message
- [x] S2: Occupation detail (summary, tasks with `NEW` label on emerging tasks, skills, knowledge, abilities, work activities/context/styles as score pins, job zone label + plain explanation, education, tech skills, related, career interests ranked list with top 3 highlighted); left jump links on desktop | Done when: detail page for 29-1141.00 shows each section from v_* views
- [x] S3: Table/data browser over allowlisted onet tables + v_* views: filter, sort, paginate, dense table per DESIGN.md, "Download CSV" as the one primary action | Done when: any allowlisted table browses; export matches filtered rows; non-allowlisted names rejected
- [x] S4: Compare 2-5 occupations on a chosen domain (skills, knowledge, abilities...) as small multiples of score pins; exactly 2 may use a paired Teal/Deep Purple chart with direct labels | Done when: compare works for 2 and 5 occupations; no chart uses more than 3 brand colors
- [x] S5: Aggregate view: group-by with Tech Teal bar charts and value labels (e.g. top elements by job zone, by career interest type) | Done when: at least 3 preset aggregations render with charts and CSV export
- [x] S6: Deep links / URL state for all pages (so AI widget can navigate later) | Done when: search, filters, compare selections round-trip through the URL
- [x] S7: Design critique pass across all pages against DESIGN.md + BRANDGUIDE.md (screenshots desktop + mobile, copy/voice, word list, contrast, focus, reduced motion) | Done when: issues found are fixed or logged
