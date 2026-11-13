# Architecture and operations

## Agreed stack
- Database: a dedicated Supabase PostgreSQL project, bts-t100-market-share.
- Source control: David2390/bts-t100-market-share, including every Python script and workflow.
- Scheduler: GitHub Actions, weekly on Monday at 06:17 America/La_Paz (10:17 UTC). Scheduled execution can be delayed by GitHub.
- Report: a Vercel-hosted dashboard (not yet implemented or deployed).

```mermaid
flowchart LR
  BTS[Open BTS T-100 annual export] --> GA[GitHub Actions: Python refresh]
  GA --> PG[Supabase PostgreSQL]
  PG --> API[Vercel server-side read-only queries]
  API --> UI[Dashboard]
```

## Database
Project ID: zlzkijtsyrlisfjydnln. Region: us-east-1.
Dashboard: https://supabase.com/dashboard/project/zlzkijtsyrlisfjydnln

The private aviation schema stores normalized monthly traffic, successful load metadata and an always-current market_share view. RLS is enabled; no anonymous/browser access is granted. The dashboard should query through a Vercel server endpoint using a dedicated read-only database login. Never send a writer connection string to a browser.

The source ZIP is downloaded temporarily, hashed and aggregated. Original source rows are not retained in PostgreSQL; the source URL and checksum provide provenance. The current loader requires a complete annual export. It does not yet discover new releases, ingest a partial current year, or automatically roll over to the next year.

## GitHub configuration still needed
Repository Settings → Secrets and variables → Actions:

| Type | Name | Value |
|---|---|---|
| Secret | DATABASE_URL | Supabase connection string with a database writer login; use the session pooler on IPv4 runners |
| Variable | BTS_SOURCE_URL | Verified public HTTPS TranStats CSV or single-CSV ZIP download URL, all domestic markets/carriers for the configured year |
| Variable | BTS_SOURCE_YEAR | 2025 initially |
| Variable | REFRESH_ENABLED | true, only after a successful manual validation run |

Use a dedicated loader login with USAGE on aviation, SELECT/INSERT/DELETE on monthly_traffic, INSERT on refresh_runs and sequence privileges. For RLS, define policies only for that dedicated role; leave browser roles ungranted. Owner credentials can bootstrap a manual test but should not be the long-term scheduled credential.

The workflow is committed but gated off until REFRESH_ENABLED is true. Configure the source URL and secret, set the gate true, then use Actions → Weekly BTS refresh → Run workflow. Verify data and run metadata after that manual run. A database update does not deploy the dashboard; Vercel should read the latest view at request time, with explicit short cache lifetime or no cache.

## Reliability
Downloads and validation finish before writes begin. A transaction and advisory lock serialize loads; replacement is scoped to the configured year and removes revised-away rows. All twelve months must be present. Failed transactions preserve prior data. Successful runs record a checksum, count and completion time. Failed runs appear in GitHub Actions; no fabricated data is substituted.

## Pending
- Verify and configure the automated BTS source URL.
- Configure the GitHub database secret and dedicated loader role.
- Execute and reconcile the first real-data refresh.
- Build the Vercel dashboard, read-only database role, filters and last-refreshed indicator.