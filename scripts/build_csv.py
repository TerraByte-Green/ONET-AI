"""Convert the O*NET Excel release into load-ready CSVs, one per database table.

Usage:
    python scripts/build_csv.py [--source onet-data] [--out data]

Each CSV's header matches the column names in supabase/migrations/. The script
also writes data/manifest.json (release info, load order, row counts), which
scripts/load.py uses.

Checks, so a new O*NET release can't quietly load wrong data:
  * every column in every source sheet is either loaded or is a redundant
    name column (Title, Element Name, Scale Name, Task, ...) whose value
    matches the reference table it duplicates;
  * dates match MM/YYYY and flags are Y/N.
"""

import argparse
import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

import openpyxl

SOC = "O*NET-SOC Code"


# --- value converters ---------------------------------------------------------

def text(v):
    if v is None:
        return None
    s = str(v).strip()
    return s or None


def num(v):
    # Integers and floats as Excel stored them; repr() keeps the exact decimal.
    if v is None or v == "":
        return None
    if isinstance(v, bool):
        raise ValueError(f"unexpected boolean {v!r}")
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v)


def yn(v):
    if v is None:
        return None
    return {"Y": "t", "N": "f"}[v]


def month(v):
    m = re.fullmatch(r"(\d{2})/(\d{4})", str(v))
    if not m:
        raise ValueError(f"bad MM/YYYY date {v!r}")
    return f"{m[2]}-{m[1]}-01"


def pg_array(v):
    return "{" + ",".join(p.strip() for p in str(v).split(",")) + "}"


# --- table specs --------------------------------------------------------------
# Each table: (table, [sources]); each source: (file, [(db_col, src_col, conv)], constants).
# Tables are listed in foreign-key load order.

def ratings_cols(category=False, not_relevant=True):
    cols = [("onetsoc_code", SOC, text), ("element_id", "Element ID", text),
            ("scale_id", "Scale ID", text)]
    if category:
        cols.append(("category", "Category", num))
    cols += [("data_value", "Data Value", num), ("n", "N", num),
             ("standard_error", "Standard Error", num),
             ("lower_ci_bound", "Lower CI Bound", num),
             ("upper_ci_bound", "Upper CI Bound", num),
             ("recommend_suppress", "Recommend Suppress", yn)]
    if not_relevant:
        cols.append(("not_relevant", "Not Relevant", yn))
    cols += [("date_updated", "Date", month), ("domain_source", "Domain Source", text)]
    return cols


SIMPLE_RATINGS = [("onetsoc_code", SOC, text), ("element_id", "Element ID", text),
                  ("scale_id", "Scale ID", text), ("data_value", "Data Value", num),
                  ("date_updated", "Date", month), ("domain_source", "Domain Source", text)]

CATEGORY_COLS = [("element_id", "Element ID", text), ("scale_id", "Scale ID", text),
                 ("category", "Category", num),
                 ("category_description", "Category Description", text)]


def crosswalk(name, from_prefix, to_prefix):
    file = name.replace("_", " ").title().replace(" To ", " to ")
    return (file, [("from_element_id", f"{from_prefix} Element ID", text),
                   ("to_element_id", f"{to_prefix} Element ID", text)],
            {"crosswalk": name})


TABLES = [
    ("occupation_data", [("Occupation Data", [
        ("onetsoc_code", SOC, text), ("title", "Title", text),
        ("description", "Description", text)], {})]),
    ("content_model_reference", [("Content Model Reference", [
        ("element_id", "Element ID", text), ("element_name", "Element Name", text),
        ("description", "Description", text)], {})]),
    ("scales_reference", [("Scales Reference", [
        ("scale_id", "Scale ID", text), ("scale_name", "Scale Name", text),
        ("minimum", "Minimum", num), ("maximum", "Maximum", num)], {})]),
    ("job_zone_reference", [("Job Zone Reference", [
        ("job_zone", "Job Zone", num), ("name", "Name", text),
        ("experience", "Experience", text), ("education", "Education", text),
        ("job_training", "Job Training", text), ("examples", "Examples", text),
        ("svp_range", "SVP Range", text)], {})]),
    ("task_categories", [("Task Categories", [
        ("scale_id", "Scale ID", text), ("category", "Category", num),
        ("category_description", "Category Description", text)], {})]),
    ("education_categories", [("Education Categories", CATEGORY_COLS, {})]),
    ("training_experience_categories", [("Training and Experience Categories", CATEGORY_COLS, {})]),
    ("work_context_categories", [("Work Context Categories", CATEGORY_COLS, {})]),
    ("level_scale_anchors", [("Level Scale Anchors", [
        ("element_id", "Element ID", text), ("scale_id", "Scale ID", text),
        ("anchor_value", "Anchor Value", num),
        ("anchor_description", "Anchor Description", text)], {})]),
    ("survey_booklet_locations", [("Survey Booklet Locations", [
        ("survey_item_number", "Survey Item Number", text),
        ("element_id", "Element ID", text), ("scale_id", "Scale ID", text)], {})]),
    ("iwa_reference", [("GWAs to IWAs", [
        ("iwa_id", "IWA Element ID", text), ("gwa_id", "GWA Element ID", text)], {})]),
    ("dwa_reference", [("GWAs to IWAs to DWAs", [
        ("dwa_id", "DWA Element ID", text), ("iwa_id", "IWA Element ID", text)], {})]),
    ("element_crosswalk", [
        crosswalk("abilities_to_work_activities", "Abilities", "Work Activities"),
        crosswalk("abilities_to_work_context", "Abilities", "Work Context"),
        crosswalk("essential_skills_to_work_activities", "Essential Skills", "Work Activities"),
        crosswalk("essential_skills_to_work_context", "Essential Skills", "Work Context"),
        crosswalk("transferable_skills_to_work_activities", "Transferable Skills", "Work Activities"),
        crosswalk("transferable_skills_to_work_context", "Transferable Skills", "Work Context"),
        crosswalk("work_styles_to_work_activities", "Work Styles", "Work Activities"),
        crosswalk("work_styles_to_work_context", "Work Styles", "Work Context"),
        crosswalk("specific_interest_areas_to_career_interest_types",
                  "Specific Interest Areas", "Career Interest Types"),
    ]),
    ("career_interest_type_keywords", [("Career Interest Type Keywords", [
        ("element_id", "Element ID", text), ("keyword", "Keyword", text),
        ("keyword_type", "Keyword Type", text)], {})]),
    ("interests_illustrative_activities", [("Interests Illustrative Activities", [
        ("element_id", "Element ID", text), ("interest_type", "Interest Type", text),
        ("activity", "Activity", text)], {})]),
    ("interests_illustrative_occupations", [("Interests Illustrative Occupations", [
        ("element_id", "Element ID", text), ("interest_type", "Interest Type", text),
        ("onetsoc_code", SOC, text)], {})]),
    ("abilities", [("Abilities", ratings_cols(), {})]),
    ("essential_skills", [("Essential Skills", ratings_cols(), {})]),
    ("transferable_skills", [("Transferable Skills", ratings_cols(), {})]),
    ("knowledge", [("Knowledge", ratings_cols(), {})]),
    ("work_activities", [("Work Activities", ratings_cols(), {})]),
    ("work_context", [("Work Context", ratings_cols(category=True), {})]),
    ("education", [("Education", ratings_cols(category=True, not_relevant=False), {})]),
    ("training_experience", [("Training and Experience",
                              ratings_cols(category=True, not_relevant=False), {})]),
    ("career_interest_types", [("Career Interest Types", SIMPLE_RATINGS, {})]),
    ("specific_interest_areas", [("Specific Interest Areas", SIMPLE_RATINGS, {})]),
    ("work_styles", [("Work Styles", SIMPLE_RATINGS, {})]),
    ("task_statements", [("Task Statements", [
        ("task_id", "Task ID", num), ("onetsoc_code", SOC, text), ("task", "Task", text),
        ("task_type", "Task Type", text),
        ("incumbents_responding", "Incumbents Responding", num),
        ("date_updated", "Date", month), ("domain_source", "Domain Source", text)], {})]),
    ("task_ratings", [("Task Ratings", [
        ("onetsoc_code", SOC, text), ("task_id", "Task ID", num),
        ("scale_id", "Scale ID", text), ("category", "Category", num),
        ("data_value", "Data Value", num), ("n", "N", num),
        ("standard_error", "Standard Error", num),
        ("lower_ci_bound", "Lower CI Bound", num), ("upper_ci_bound", "Upper CI Bound", num),
        ("recommend_suppress", "Recommend Suppress", yn),
        ("date_updated", "Date", month), ("domain_source", "Domain Source", text)], {})]),
    ("tasks_to_dwas", [("Tasks to DWAs", [
        ("onetsoc_code", SOC, text), ("task_id", "Task ID", num),
        ("dwa_id", "DWA Element ID", text),
        ("date_updated", "Date", month), ("domain_source", "Domain Source", text)], {})]),
    ("emerging_tasks", [("Emerging Tasks", [
        ("onetsoc_code", SOC, text), ("task", "Task", text), ("category", "Category", text),
        ("original_task_id", "Original Task ID", num),
        ("date_updated", "Date", month), ("domain_source", "Domain Source", text)], {})]),
    ("job_zones", [("Job Zones", [
        ("onetsoc_code", SOC, text), ("job_zone", "Job Zone", num),
        ("date_updated", "Date", month), ("domain_source", "Domain Source", text)], {})]),
    ("job_titles", [("Job Titles", [
        ("onetsoc_code", SOC, text), ("job_title", "Job Title", text),
        ("short_title", "Short Title", text), ("sources", "Source(s)", pg_array)], {})]),
    ("sample_of_reported_titles", [("Sample of Reported Titles", [
        ("onetsoc_code", SOC, text), ("reported_job_title", "Reported Job Title", text),
        ("shown_in_my_next_move", "Shown in My Next Move", yn)], {})]),
    ("related_occupations", [("Related Occupations", [
        ("onetsoc_code", SOC, text), ("related_onetsoc_code", "Related O*NET-SOC Code", text),
        ("relatedness_tier", "Relatedness Tier", text), ("related_index", "Index", num)], {})]),
    ("software_skills", [("Software Skills", [
        ("onetsoc_code", SOC, text), ("workplace_example", "Workplace Example", text),
        ("element_id", "Element ID", text), ("hot_technology", "Hot Technology", yn),
        ("in_demand", "In Demand", yn)], {})]),
    ("occupation_level_metadata", [("Occupation Level Metadata", [
        ("onetsoc_code", SOC, text), ("item", "Item", text), ("response", "Response", text),
        ("n", "N", num), ("percent", "Percent", num), ("date_updated", "Date", month)], {})]),
]


# --- redundant-name checks ------------------------------------------------------

class Reference:
    """Lookups used to verify the name columns that are dropped on load."""

    def __init__(self):
        self.titles = {}
        self.elements = {}
        self.scales = {}
        self.tasks = {}
        self.iwa_gwa = {}

    def check(self, header, row, loaded):
        """Return the set of columns verified as redundant, raising on mismatch.

        Columns in `loaded` are stored, not dropped, so they are not checked.
        """
        verified = set()
        get = dict(zip(header, row)).get

        def expect(name_col, lookup, key_col):
            if name_col in header and key_col in header and name_col not in loaded:
                key, name = get(key_col), text(get(name_col))
                if key is None and name is None:
                    verified.add(name_col)
                    return
                ref = lookup.get(key)
                if ref is None or ref != name:
                    raise ValueError(f"{name_col}={name!r} does not match reference "
                                     f"{ref!r} for {key_col}={key!r}")
                verified.add(name_col)

        expect("Title", self.titles, SOC)
        expect("Related Title", self.titles, "Related O*NET-SOC Code")
        expect("Scale Name", self.scales, "Scale ID")
        expect("Task", self.tasks, "Task ID")
        expect("Original Task", self.tasks, "Original Task ID")
        expect("GWA Element ID", self.iwa_gwa, "IWA Element ID")
        for col in header:
            if col and col.endswith("Element Name"):
                expect(col, self.elements, col.replace("Element Name", "Element ID"))
        return verified


def read_sheet(path):
    wb = openpyxl.load_workbook(path, read_only=True)
    ws = wb.worksheets[0]
    rows = ws.iter_rows(values_only=True)
    header = tuple(next(rows))
    for row in rows:
        if any(v is not None for v in row):
            yield header, row
    wb.close()


def read_release(source):
    readme = (source / "Read Me.txt").read_text(encoding="utf-8", errors="replace")
    release = re.search(r"O\*NET\s+([\d.]+)\s+Database", readme)
    name = re.search(r"^(\w+ \d{4} Release)", readme, re.M)
    if not release:
        sys.exit("Could not find the release number in Read Me.txt")
    return {
        "release": release[1],
        "release_name": name[1] if name else None,
        "source_url": f"https://www.onetcenter.org/dictionary/{release[1]}/excel/",
        "license": "CC BY 4.0 (https://www.onetcenter.org/license_db.html)",
    }


def build_table(table, sources, src_dir, out_dir, ref):
    out_cols = None
    count = 0
    out_path = out_dir / f"{table}.csv"
    with out_path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh, lineterminator="\n")
        for file, cols, consts in sources:
            path = src_dir / f"{file}.xlsx"
            if not path.exists():
                raise FileNotFoundError(path)
            db_cols = list(consts) + [c[0] for c in cols]
            if out_cols is None:
                out_cols = db_cols
                writer.writerow(out_cols)
            elif db_cols != out_cols:
                raise ValueError(f"{table}: inconsistent columns across sources")
            used = {c[1] for c in cols}
            checked_header = False
            for header, row in read_sheet(path):
                verified = ref.check(header, row, used)
                if not checked_header:
                    unknown = set(header) - used - verified
                    missing = used - set(header)
                    if unknown or missing:
                        raise ValueError(f"{file}: unhandled columns {sorted(unknown)}, "
                                         f"missing columns {sorted(missing)}")
                    checked_header = True
                values = dict(zip(header, row))
                try:
                    out = list(consts.values()) + [conv(values[src]) for _, src, conv in cols]
                except (KeyError, ValueError) as e:
                    raise ValueError(f"{file}, row {count + 2}: {e}") from e
                writer.writerow(out)
                count += 1
                # Record lookups once their source table has been read.
                if table == "occupation_data":
                    ref.titles[values[SOC]] = text(values["Title"])
                elif table == "content_model_reference":
                    ref.elements[values["Element ID"]] = text(values["Element Name"])
                elif table == "scales_reference":
                    ref.scales[values["Scale ID"]] = text(values["Scale Name"])
                elif table == "iwa_reference":
                    ref.iwa_gwa[values["IWA Element ID"]] = values["GWA Element ID"]
                elif table == "task_statements":
                    ref.tasks[values["Task ID"]] = text(values["Task"])
    return count


def main():
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--source", type=Path, default=root / "onet-data",
                    help="directory containing the O*NET .xlsx files")
    ap.add_argument("--out", type=Path, default=root / "data",
                    help="output directory for CSVs and manifest.json")
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    release = read_release(args.source)
    print(f"O*NET {release['release']} ({release['release_name']})")

    ref = Reference()
    counts = {}
    for table, sources in TABLES:
        counts[table] = build_table(table, sources, args.source, args.out, ref)
        print(f"  {table:<36} {counts[table]:>8,} rows")

    known = {f"{s[0]}.xlsx" for _, sources in TABLES for s in sources}
    unused = sorted(p.name for p in args.source.glob("*.xlsx") if p.name not in known)
    if unused:
        sys.exit(f"Source files not mapped to any table: {unused}")

    stale = sorted(p.name for p in args.out.glob("*.csv") if p.stem not in counts)
    if stale:
        print(f"Warning: CSVs in {args.out} that are no longer produced: {stale}")

    manifest = {**release, "tables": [{"table": t, "rows": counts[t]} for t, _ in TABLES]}
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Wrote {len(counts)} CSVs ({sum(counts.values()):,} rows) to {args.out}")


if __name__ == "__main__":
    main()
