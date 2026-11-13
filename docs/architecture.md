# Architecture and operations

The source of truth for requirements and model definitions is the repository README.

## Services
- GitHub: https://github.com/David2390/bts-t100-market-share
- Supabase project: https://supabase.com/dashboard/project/zlzkijtsyrlisfjydnln
- Vercel team: davidemendez14-3404 (Hobby)

## Storage and transformation
The official BTS download form is submitted for 2025 and 2026 by src/download_bts.py. src/build_model.py validates yearly/monthly coverage, filters passenger service, constructs dimensions, aggregates the fact grain, calculates shares and the QSI proxy, and writes Zstandard Parquet. Bronze files preserve every downloaded source column and row. Gold files contain the modeled tables and route report. No dummy records are used.

Raw ZIP and Parquet files are excluded from Git. The private Supabase Storage bucket aviation-parquet contains the initial eight Parquet files. PostgreSQL tables live in the aviation schema. Public reporting views use security_invoker and SELECT-only RLS policies for the public aviation data. No browser role can write tables or list the private bucket.

## Database loading
src/load_model.py copies Parquet into temporary staging tables, upserts dimensions and replaces the two source years inside one transaction protected by an advisory lock. Failure preserves the previous published model. pipeline_status records the metadata and successful-load timestamp in the same transaction.

The dedicated aviation_loader login has SELECT/INSERT/UPDATE/DELETE grants and matching RLS policies on the reporting model, not project-admin privileges. Its connection string belongs only in the DATABASE_URL GitHub Actions secret. Use a reachable session pooler if an execution environment lacks IPv6; direct connectivity was verified during the initial load. Never commit a password.

## Refresh
.github/workflows/refresh.yml runs Mondays at 10:17 UTC (06:17 America/La_Paz) and supports manual dispatch. Set repository variable REFRESH_ENABLED=true after configuring secrets. GitHub may delay scheduled execution, and may disable inactive public-repository schedules. The workflow re-downloads both years so source revisions are captured. Published 2026 months must be contiguous from January; it does not assume the calendar month has been released.

GitHub Actions retains the Parquet dataset and quality report as 30-day artifacts. The workflow stores a versioned snapshot in the private Supabase bucket before database loading. It retains two snapshots to limit storage growth; the initial root-level files are retained. S3 credentials bypass storage RLS and can access every bucket in this dedicated aviation project, so they stay only in encrypted GitHub Actions secrets.

## Dashboard
The buildless dashboard reads the latest reporting views at request time with cache:no-store. Its client key is a publishable Supabase key, not a database or service-role secret. A data refresh therefore requires no Vercel rebuild. The initial Vercel deployment used an upload of the dashboard folder. The Vercel project now connects to this GitHub repository, deploys branch `main` and has Root Directory `dashboard`, so new GitHub commits trigger production builds. The dashboard reports monthly market shares, avoiding misleading comparisons of full-year 2025 with partial-year 2026.

## Recovery
If downloading, validation or loading fails, inspect the GitHub Actions run and retain the last valid report. Do not substitute synthetic data. The initial source checksums and row counts are in reports/data-quality.json. Rebuild from original exports to reproduce the measures.