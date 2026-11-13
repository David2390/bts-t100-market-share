"""Aggregate one non-overlapping BTS T-100 CSV and compute market shares."""
import argparse
import csv
import math
from collections import defaultdict
from pathlib import Path


def normalized(value):
    return "".join(c for c in value.upper() if c.isalnum())


def analyze(source, destination):
    grouped = defaultdict(lambda: [0.0, 0.0, 0.0])
    with source.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = {normalized(h): h for h in (reader.fieldnames or [])}
        aliases = {
            "year": ["YEAR"], "month": ["MONTH"],
            "airline": ["AIRLINEID"], "origin": ["ORIGIN"],
            "dest": ["DEST"], "class": ["CLASS"],
            "passengers": ["PASSENGERS"], "seats": ["SEATS"],
            "departures": ["DEPARTURESPERFORMED", "DEPPERFORMED"],
        }
        fields = {}
        for name, choices in aliases.items():
            fields[name] = next((headers[c] for c in choices if c in headers), None)
            if fields[name] is None:
                raise ValueError(f"Missing required field: {name}")
        for line, row in enumerate(reader, 2):
            if row[fields["class"]].strip().upper() != "F":
                continue
            try:
                year, month = int(row[fields["year"]]), int(row[fields["month"]])
                if not (1900 <= year <= 2100 and 1 <= month <= 12):
                    raise ValueError("Invalid period")
                ids = tuple(row[fields[k]].strip() for k in ("origin", "dest", "airline"))
                if not all(ids):
                    raise ValueError("Empty market/carrier identifier")
                values = [float(row[fields[k]]) for k in ("passengers", "seats", "departures")]
                if any(not math.isfinite(v) or v < 0 for v in values):
                    raise ValueError("Invalid measure")
            except (ValueError, TypeError, AttributeError) as exc:
                raise ValueError(f"Invalid input on CSV line {line}: {exc}") from exc
            key = (year, month, *ids)
            grouped[key] = [a + b for a, b in zip(grouped[key], values)]
    if not grouped:
        raise ValueError("No scheduled passenger (class F) rows found")
    totals = defaultdict(lambda: [0.0, 0.0, 0.0])
    for key, values in grouped.items():
        totals[key[:4]] = [a + b for a, b in zip(totals[key[:4]], values)]
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["year", "month", "origin", "destination", "airline_id",
                         "passengers", "seats", "departures", "passenger_share",
                         "seat_share", "departure_share", "load_factor", "share_gap_pp"])
        for key, values in sorted(grouped.items()):
            shares = [v / t if t else None for v, t in zip(values, totals[key[:4]])]
            load = values[0] / values[1] if values[1] else None
            gap = 100 * (shares[0] - shares[1]) if all(s is not None for s in shares[:2]) else None
            writer.writerow([*key, *values, *shares, load, gap])
    print(f"Wrote {len(grouped):,} airline-market-month rows to {destination}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", type=Path, default=Path("data/processed/market_share.csv"))
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        parser.error("Input and output must be different files")
    analyze(args.input, args.output)