"""Download a complete BTS annual export and atomically replace that year."""
import csv
import hashlib
import os
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path
from urllib.parse import urlparse
from analyze import analyze


def bts_url(value):
    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.hostname not in {"transtats.bts.gov", "www.transtats.bts.gov"}:
        raise ValueError("BTS_SOURCE_URL must be an official HTTPS TranStats download")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Use a public BTS download URL without credentials or query parameters")
    return value


class BTSRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        bts_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def load_rows(path, year):
    with path.open(encoding="utf-8", newline="") as handle:
        rows = list(csv.DictReader(handle))
    if not rows or {int(r["year"]) for r in rows} != {year}:
        raise ValueError("Export must contain exactly the configured source year")
    if {int(r["month"]) for r in rows} != set(range(1, 13)):
        raise ValueError("A complete annual export with all 12 months is required")
    return [tuple(r[k] for k in ("year", "month", "origin", "destination", "airline_id",
                                 "passengers", "seats", "departures")) for r in rows]


def refresh():
    import psycopg
    source = bts_url(os.environ["BTS_SOURCE_URL"])
    year = int(os.environ.get("BTS_SOURCE_YEAR", "2025"))
    database_url = os.environ["DATABASE_URL"]
    with tempfile.TemporaryDirectory() as directory:
        directory = Path(directory)
        download = directory / "source"
        opener = urllib.request.build_opener(BTSRedirects())
        with opener.open(source, timeout=120) as response, download.open("wb") as target:
            while chunk := response.read(1024 * 1024):
                target.write(chunk)
        with download.open("rb") as handle:
            digest = hashlib.file_digest(handle, "sha256").hexdigest()
        source_csv = download
        if zipfile.is_zipfile(download):
            with zipfile.ZipFile(download) as archive:
                candidates = [n for n in archive.namelist() if n.lower().endswith(".csv")]
                if len(candidates) != 1:
                    raise ValueError("Expected exactly one CSV in the BTS ZIP export")
                source_csv = directory / "source.csv"
                with archive.open(candidates[0]) as src, source_csv.open("wb") as dst:
                    while chunk := src.read(1024 * 1024):
                        dst.write(chunk)
        processed = directory / "processed.csv"
        analyze(source_csv, processed)
        rows = load_rows(processed, year)
        # All writes commit together. Download/validation errors leave prior data intact.
        with psycopg.connect(database_url, sslmode="require", connect_timeout=30,
                             prepare_threshold=None) as connection:
            connection.execute("select pg_advisory_xact_lock(100100)")
            connection.execute("create temporary table staged_traffic (like aviation.monthly_traffic including constraints) on commit drop")
            with connection.cursor().copy("copy staged_traffic from stdin") as copy:
                for row in rows:
                    copy.write_row(row)
            connection.execute("delete from aviation.monthly_traffic where year = %s", (year,))
            connection.execute("insert into aviation.monthly_traffic select * from staged_traffic")
            connection.execute(
                "insert into aviation.refresh_runs (source_year, source_url, source_sha256, loaded_rows) values (%s,%s,%s,%s)",
                (year, source, digest, len(rows)),
            )
        print(f"Published {len(rows):,} airline-market-month rows for {year} to Supabase")
        if summary := os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(summary, "a", encoding="utf-8") as handle:
                handle.write(f"## BTS refresh complete\nYear: {year}\n\nRows: {len(rows):,}\n\nSource SHA-256: `{digest}`\n")


if __name__ == "__main__":
    try:
        refresh()
    except Exception as exc:
        # Database errors can contain connection details: report the type only.
        print(f"Refresh failed ({type(exc).__name__}). Check source/configuration; prior transaction rolled back.", file=sys.stderr)
        sys.exit(1)