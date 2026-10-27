# CLAUDE.md

## Session Start (do in order)
1. Read `build-log/CURRENT.md`. This is the source of truth for where work stopped.
2. Read only the planning file for the active phase listed in CURRENT.md (`planning/phase-NN-<name>.md`).
3. Do not read other files unless the current task requires them.
4. If `build-log/CURRENT.md` does not exist, read `STARTHERE.md` and run the Planning steps below.

## Folder Structure
- `STARTHERE.md`: raw tasks and asks from the user. Input only.
- `planning/`: phases and stories built from STARTHERE.md.
- `build-log/`: context files so a cleared session can resume quickly.
- `onet-data/`: source O*NET xlsx files. Read-only.
- `data/`: generated CSVs + `manifest.json` (from `scripts/build_csv.py`). Never open whole; use `manifest.json` or read a few lines.
- `scripts/`: `build_csv.py` (xlsx → CSV), `load.py` (CSV → Postgres).
- `supabase/migrations/`: schema and view SQL.
- `README.md` (root): user-facing project docs. Not the planning index.

## Planning
Break every task in `STARTHERE.md` into phases.
- `planning/README.md`: flat index, one line per phase: `NN <name> | <todo/active/done> | <path>`.
- `planning/phase-NN-<name>.md`: one file per todo/active phase, using the format below. Number phases sequentially (01, 02, ...).
- `planning/completed/`: when every story in a phase is ticked, move its file here and set it to `done` in the index.

```
# Phase NN: <name>
Goal: <one sentence>
## Stories
- [ ] S1: <story> | Done when: <acceptance criteria>
- [ ] S2: ...
```

Keep stories small enough to finish in one session. When STARTHERE.md changes, update `planning/README.md` and the affected phase files only.

## Build Log
| File | Purpose | Update rule |
|---|---|---|
| `build-log/CURRENT.md` | Active phase, active story, next step, blockers | Overwrite. Max 30 lines. |
| `build-log/DECISIONS.md` | Technical decisions and the reason for each | Append only. One line per decision. |
| `build-log/sessions/YYYY-MM-DD.md` | What changed this session, files touched | One file per session. Short bullets. |

CURRENT.md format:
```
Phase: NN <name>
Story: SN <story>
Status: <in progress / blocked>
Next step: <one concrete action>
Blockers: <none / description>
Key files: <paths>
```

Update the build log when:
- a story is completed (also tick its checkbox in the phase file)
- a phase is completed (move it to `planning/completed/`, update the index, point CURRENT.md at the next phase)
- a decision is made
- the user says "save context" or the session is ending

## References

Any context that needs to be shared, that the user mentions is usually found in `ref/` folder, this folder will have random files that help with prompt context
- `ref/BRANDGUIDE.md`: TerraByte Green branding. All GUI/design work must follow it (colors, fonts, contrast, logo, voice). Design system for the app: `web/DESIGN.md`.
- `ref/` is gitignored (internal). Brand images the app needs are copied into `web/public/brand/`.

## Token Efficiency
- Do not re-read a file already read this session unless it changed.
- Search (grep, glob) to locate code before opening files. Read line ranges, not whole files, when possible.
- Edit with targeted changes. Do not rewrite full files for small edits.
- Do not echo file contents or code back to the user after writing it.
- Load phase files one at a time, only the active one.

## Brevity
- Default output is minimal: what was done, files changed, next step.
- No explanations, summaries, alternatives, or recommendations unless the user asks.
- Give details only when the user requests them.
- Ask a question only when blocked or when the task is ambiguous.