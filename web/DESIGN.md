# TerraByte Green Career Explorer: design system

Built with the frontend-design skill inside the rules of `ref/BRANDGUIDE.md`. Where they disagree, the brand guide wins.

## Brief
- **Product:** TerraByte Green Career Explorer, a web app for searching, reading, comparing and aggregating O*NET (the U.S. Department of Labor's occupation database) data.
- **Audience:** job seekers and workshop participants, from teens to older adults, plus the TerraByte Green staff and volunteers who guide them.
- **Primary job:** find an occupation fast and understand what the work involves, then compare it with others.
- **Pillar served:** Skills (brand guide section 11). Access alone is not enough; knowing what jobs ask for is the next step.

## Color
Only the brand tokens. No new hex values, tints or gradients. Max 3 brand colors per component, plus white.

| Token | Hex | Role in the app |
|---|---|---|
| `--tbg-white` | `#FFFFFF` | Page and panel background (most of the screen) |
| `--tbg-earth-brown` | `#544842` | All body text, table text, outlines, footer panel, AI widget header |
| `--tbg-sky-blue` | `#6DCFF6` | Top header band only, with the thin wave edge |
| `--tbg-sunshine-yellow` | `#F3EC4C` | Primary button, current nav item, selected row, highlighter underline |
| `--tbg-leaf-green` | `#85BF4F` | Borders on the offset shadow box, section dividers |
| `--tbg-tech-teal` | `#0097A7` | Filled score pins, chart bars. Never body-size text |
| `--tbg-chip-green` | `#7CC576` | Unfilled score pins (decorative; the number is always printed) |
| `--tbg-deep-purple` | `#442E66` | Second chart series in compare; nothing else |

Contrast rules (brand guide section 3):
- Text is Earth Brown on white, sky blue or yellow; or white on Earth Brown / Deep Purple.
- Links: Earth Brown, underlined. Hover and active add the yellow highlighter underline.
- Focus ring: `3px solid var(--tbg-earth-brown)`, offset 3px; Sunshine Yellow on brown surfaces.
- Light theme only. Dark theme needs owner approval first.

### Charts
- **Single measure:** Tech Teal bars on white, value labels in Earth Brown.
- **Career interests (6 types):** one ranked bar list, not 6 colors. The top 3 types (the occupation's interest code) are Tech Teal; the other 3 are Earth Brown outline. The highlight carries meaning: these are the code.
- **Compare (2 to 5 occupations):** small multiples, one row per occupation using the same score pins, so color never has to tell occupations apart. A paired chart of exactly 2 occupations may use Tech Teal and Deep Purple with direct labels.
- Never rely on color alone: every bar and pin row has its number beside it.

## Type
| Role | Face | Setting |
|---|---|---|
| Headings, big numbers | DM Sans 800 / 700 | Tight leading (1.1), sentence case |
| Body, UI, tables | DM Sans 400 / 500 | 16px minimum body, 1.5 leading, tabular numerals in tables |
| Pixel labels | Silkscreen | Tiny, a few words max, only where they carry information |

Scale (1.25 ratio, rem): 0.8 / 1 / 1.25 / 1.563 / 1.953 / 2.441 / 3.052. Body line length under 75 characters; tables may run full width.

Silkscreen labels used in the app, and only these:
- `NEW` on emerging tasks
- `ZONE 1` to `ZONE 5` for job zones (how much preparation a job needs)
- `1/5` style counters in step-through views

Load both through `next/font/google` (DM Sans 400/500/700/800, Silkscreen 400). No other families.

## Brand assets
Source files live in `ref/` (gitignored). Copy them into `web/public/brand/` unchanged:

| Use | Source file | Notes |
|---|---|---|
| Header lockup | `ref/logos/terrabytegreen logo.png` | Min 150px wide; clear space about 1/8 of icon width |
| Favicon, small spaces | `ref/logos/terrabyte_site_icon.png` | 512px square; min 40px |
| AI widget host, empty states, 404 | `ref/Mascot.png` | `image-rendering: pixelated`; whole-number scaling; no name until the org picks one |

Never redraw, recolor, crop, shadow or retype the logo or mascot. Leave the mascot off serious content.

## Signature element: score pins
O*NET rates each skill, ability, knowledge area and work activity for **importance** (1 to 5) and **level** (0 to 7). The app shows every score as a row of chip-pin squares, the pins on the brand's microchip logo.

```
Active listening      importance  ■■■■■■■■■■■■■■■■□□□□  4.1
                      level       ■■■■■■■■■■■■□□□□□□□□  4.4
```
- 20 pins per row; filled count = score scaled to the scale's range, rounded to the nearest pin.
- Filled pins Tech Teal, unfilled Chip Green, 8px squares with 4px gaps (matches `.tbg-chip-pins`).
- Number printed to one decimal at the end of every row. Screen readers get "Importance 4.1 out of 5".
- Used on detail, compare and aggregate pages. This is the one memorable element; everything else stays quiet.

## Layout
Left-aligned throughout. White space is generous around content and tight inside tables.

Desktop (1024px and up):
```
+------------------------------------------------------------------+
| [logo lockup]   Search  Occupations  Compare  Explore data    (?)|  Sky Blue band
|~~~~~~~~~~~~~~~~~~~~~~ thin yellow-to-green wave ~~~~~~~~~~~~~~~~~~|
+---------+------------------------------------------+-------------+
|         |  Page title                              |  AI widget  |
| filters |  === divider                             |  [mascot]   |
| (pages  |                                          |  Ask about  |
|  that   |  content                                 |  careers    |
|  need   |                                          |             |
|  them)  |                                          |  (folds to  |
|         |                                          |   a tab)    |
+---------+------------------------------------------+-------------+
| Earth Brown footer: tagline in the signature 3-color style, data source line |
+------------------------------------------------------------------+
```
- Header: lockup left, nav right, current page marked with a yellow highlighter underline.
- AI widget: 360px right panel with Earth Brown header and mascot. Folds to an edge tab. Opens and closes with a short slide that shows where it went; no motion under `prefers-reduced-motion`.
- Mobile (under 768px): nav becomes a menu button, filters a sheet, AI widget a full-height bottom sheet opened from a fixed button with the mascot icon. Works down to 320px.

Home:
```
+------------------------------------------------------------------+
| Sky Blue band                                                    |
|   What kind of work are you curious about?        [mascot]       |
|   +============================================+                 |
|   | [ Search jobs, skills or a code like 29-1141 ] [Search] |    |  offset shadow box
|   +============================================+                 |
+------------------------------------------------------------------+
|  Browse by job zone   Browse by career interest   Explore data   |
|  O*NET release 31.0 · counts                                     |
+------------------------------------------------------------------+
```
- The search box is the hero and the page's one primary action, in the yellow offset shadow box with a Leaf Green border.
- The offset shadow box appears once per page at most.

Occupation detail: title, SOC code and job zone label on top; short description; then sections (tasks, skills, knowledge, abilities, work activities, work context, work styles, education, technology, related occupations). Each section has a heading, the 3-segment divider, and pin rows or a plain list. In-page jump links on the left at desktop.

Table/data browser: plain dense table, sticky header, Earth Brown 1px row rules, selected row in yellow. One primary action: "Download CSV".

## Components
- **Buttons:** primary is yellow with Earth Brown text and a 2px Earth Brown border; secondary is white with an Earth Brown border. Radius 6px. One primary per view.
- **Radius:** 6px on buttons and inputs, 12px on panels, 0 on pins and table cells. Hierarchy shows in the radius, not one value everywhere.
- **Shadows:** none, except the solid offset shadow box. No blur shadows.
- **Section divider:** `.tbg-divider` (green 96px, yellow 40px, sky 20px) under page and section headings.
- **Cards:** avoided. Results are lists with rules, not grids of identical cards.

## Voice and copy
Friendly neighbor who happens to know careers: patient, plain, practical.
- Sentence case everywhere. Numerals for numbers.
- Explain O*NET terms on first use per page: "Job zone 3 (medium preparation: some training or an associate's degree)".
- Buttons say what happens: "Search", "Compare 3 jobs", "Download CSV". The same verb follows through ("Download CSV" leads to "CSV downloaded").
- Empty search: mascot plus "No jobs match "xyz". Try a shorter word or a job code like 15-1252." No apologies.
- Errors say what happened and what to do: "We couldn't reach the database. Refresh in a minute."
- Name: always "TerraByte Green". Footer data credit: "Data: O*NET 31.0 Database, U.S. Department of Labor, Employment and Training Administration (USDOL/ETA)." (confirm exact credit wording against O*NET's license page before launch).
- Use the guide's word list: "job seekers", "participants", "community members". Never "the needy" or "beneficiaries".

## Quality floor
WCAG AA per the brand contrast table; visible keyboard focus; `prefers-reduced-motion` respected; 320px minimum width; 16px minimum body text; alt text on the logo ("TerraByte Green") and mascot (`alt=""` where decorative).

## Review against generic defaults
- **Dropped:** the first-pass workwear palette and the career-interest hexagon. The brand fixes the palette, and a 6-color hexagon would break the 3-color limit.
- **Changed:** compare uses small multiples instead of one color per occupation, which works within the 3-color limit and reads better for 5 jobs.
- **Avoided:** the SaaS card grid (lists with rules instead), blur shadows, accent-one-word headlines, and all-caps eyebrow labels. The only all-caps text is Silkscreen labels that carry data.
- **Kept bold in one place:** the score pins. The header wave, divider and shadow box are brand motifs used sparingly, once per page each.
