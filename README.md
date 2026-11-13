# US Airline Market Share & Capacity Analysis

A portfolio project using real, publicly available BTS T-100 Domestic Segment (All Carriers) data.

**Business question:** Which airlines carry more or fewer passengers than their capacity share on a given nonstop route?

## Project description
This project explores airline competition in the US domestic market using publicly available BTS T-100 traffic data. It compares the passengers each airline transports with the seats and departures it operates on individual routes, helping identify where traffic share is above or below capacity share.

The goal is to turn raw aviation records into a reproducible analysis that supports commercial questions: Which routes are most competitive? How does airline performance change through the year? Where do passenger share and capacity share diverge?

The planned deliverables are a validated market-share dataset, route-level visualizations, and a concise commercial brief. The initial pipeline uses Python with no external dependencies. This repository documents the process from source acquisition and metric definitions through analysis and interpretation.

## Scope
- Initial period: January–December 2025, subject to source completeness checks.
- Market: directional airport pair (JFK–LAX differs from LAX–JFK).
- Grain: month × origin × destination × reporting airline.
- Scheduled passenger service only (service class F).
- Carrier results describe reporting operators, not consolidated marketing brands.

## Metrics
- Passenger share = airline passengers / all included airline passengers in the market-month.
- Seat share = airline seats / all included airline seats in the market-month.
- Departure share = airline performed departures / market-month performed departures.
- Load factor = passengers / seats.
- Share gap (percentage points) = 100 × (passenger share − seat share).

These capacity and frequency benchmarks are not a full QSI model. T-100 is segment traffic, not passenger itinerary O&D demand. A positive gap is descriptive and does not establish profitability or causation.

## Run
1. Follow [data acquisition](docs/data-source.md). Download one complete 2025 export with all carriers and routes; extract the CSV into `data/raw/`.
2. Install Python 3.10+ (the pipeline uses only the standard library).
3. From this folder, run:

```powershell
python src/analyze.py --input "data/raw/YOUR_BTS_FILE.csv" --output data/processed/market_share.csv
```

The script aggregates aircraft-level source rows before computing shares. It rejects missing fields, invalid periods and negative measures. Do not filter competitors out before computing market totals. Do not combine overlapping exports.

## Structure
```text
data/raw/          Untouched source downloads (excluded from Git)
data/interim/      Optional intermediate transformations
data/processed/    Derived market-share tables (excluded from Git)
docs/              Source, definitions and project plan
notebooks/         Future exploratory notebooks
src/               Reproducible analysis code
reports/figures/   Charts and final findings
```

## Current status
Project scaffold and analysis pipeline prepared. Real data has not yet been downloaded or analyzed; no findings are claimed. See [project plan](docs/project-plan.md).