"""Load the CSVs in data/ into the onet schema, replacing whatever is there.

Usage:
    python scripts/load.py [--data data] [--wait-for-migrations SECONDS]

Reads DATABASE_URL from the environment or from .env. The schema must already
exist (apply supabase/migrations/ first). Everything runs in one transaction:
if any table fails to load or a row count doesn't match the manifest, nothing
changes.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import psycopg
from dotenv import load_dotenv

SCHEMA = "onet"


def wait_for_migrations(url, migrations_dir, timeout):
    """Block until Supabase has applied the newest migration in the repo.

    Used in CI, where the Supabase GitHub integration applies migrations on the
    same push that triggers this load.
    """
    latest = max(p.name.split("_", 1)[0] for p in migrations_dir.glob("*.sql"))
    deadline = time.monotonic() + timeout
    with psycopg.connect(url, autocommit=True) as conn:
        while True:
            try:
                applied = conn.execute(
                    "select 1 from supabase_migrations.schema_migrations where version = %s",
                    (latest,)).fetchone()
            except psycopg.errors.UndefinedTable:
                applied = None
            if applied:
                print(f"Migration {latest} is applied")
                return
            if time.monotonic() > deadline:
                sys.exit(f"Timed out after {timeout}s waiting for migration {latest}. "
                         "Check the Supabase GitHub integration's deploy log.")
            print(f"Waiting for Supabase to apply migration {latest}...")
            time.sleep(15)


def main():
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", type=Path, default=root / "data",
                    help="directory containing the CSVs and manifest.json")
    ap.add_argument("--wait-for-migrations", type=int, metavar="SECONDS",
                    help="first wait up to SECONDS for the newest supabase/migrations "
                         "file to be applied (for CI with the Supabase GitHub integration)")
    args = ap.parse_args()

    load_dotenv(root / ".env")
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set (see .env.example)")

    if args.wait_for_migrations:
        wait_for_migrations(url, root / "supabase" / "migrations", args.wait_for_migrations)

    manifest = json.loads((args.data / "manifest.json").read_text())
    tables = [t["table"] for t in manifest["tables"]]
    expected = {t["table"]: t["rows"] for t in manifest["tables"]}
    print(f"Loading O*NET {manifest['release']} ({len(tables)} tables)")

    with psycopg.connect(url) as conn:
        with conn.cursor() as cur:
            qualified = ", ".join(f"{SCHEMA}.{t}" for t in tables + ["release_info"])
            cur.execute(f"truncate {qualified} restart identity")

            for table in tables:
                start = time.monotonic()
                path = args.data / f"{table}.csv"
                with path.open("rb") as fh:
                    header = fh.readline().decode("utf-8").strip()
                    copy_sql = (f"copy {SCHEMA}.{table} ({header}) "
                                "from stdin with (format csv)")
                    with cur.copy(copy_sql) as copy:
                        while chunk := fh.read(1 << 20):
                            copy.write(chunk)
                cur.execute(f"select count(*) from {SCHEMA}.{table}")
                loaded = cur.fetchone()[0]
                if loaded != expected[table]:
                    raise RuntimeError(f"{table}: loaded {loaded} rows, "
                                       f"manifest says {expected[table]}")
                print(f"  {table:<36} {loaded:>8,} rows  {time.monotonic() - start:5.1f}s")

            cur.execute(
                f"insert into {SCHEMA}.release_info (release, release_name, source_url, license) "
                "values (%s, %s, %s, %s)",
                (manifest["release"], manifest["release_name"],
                 manifest["source_url"], manifest["license"]))
        conn.commit()

        # Refresh planner statistics after the bulk load.
        conn.autocommit = True
        conn.execute(f"analyze {qualified}")

    print(f"Done: {sum(expected.values()):,} rows loaded.")


if __name__ == "__main__":
    main()
