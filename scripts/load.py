"""Load the CSVs in data/ into the onet schema, replacing whatever is there.

Usage:
    python scripts/load.py [--data data]

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


def main():
    root = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", type=Path, default=root / "data",
                    help="directory containing the CSVs and manifest.json")
    args = ap.parse_args()

    load_dotenv(root / ".env")
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set (see .env.example)")

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
