# Flightpath documentation

Flightpath is a public portfolio dashboard for US nonstop airline market share. The [live report](https://bts-t100-market-share.vercel.app/) uses official BTS T-100 Domestic Segment data, Python transformations, compressed Parquet, Supabase PostgreSQL, and a weekly GitHub Actions refresh.

## Read in this order

1. [Project README](../README.md): scope, measures, current coverage, local setup, and deployment.
2. [Data source and definitions](data-source.md): BTS provenance, field interpretation, and limitations.
3. [Architecture and operations](architecture.md): data flow, database, storage, refresh, and recovery.
4. [Design and airline marks](design-and-marks.md): visual direction, airline colors, PNG mark provenance, and limitations.
5. [Delivery plan](project-plan.md): delivered work and remaining editorial work.

## Current published baseline

The initial verified load contains all of 2025 and January–August 2026: 298,410 airline-route-month fact rows, 93 reporting airlines, 704 airports, and 19,252 directional routes. Data coverage advances when BTS publishes additional months and the weekly refresh succeeds. Check the latest GitHub Actions run and `pipeline_status` for the most recent load; the baseline figures above are not a promise that BTS has already published later periods.

The QSI value is a transparent, uncalibrated nonstop capacity and schedule proxy. It is not an itinerary demand model or a commercial QSI calibration. The SkyUp and AirAsia PDFs supplied by the project owner informed the design; their original files and proprietary font files are not redistributed in this repository.
