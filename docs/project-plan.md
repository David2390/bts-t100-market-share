# Delivery plan and status

## Delivered

- Downloaded and validated the official BTS T-100 Domestic Segment exports for full-year 2025 and January–August 2026.
- Built the Python aggregation pipeline, Zstandard Parquet snapshots, and a Supabase PostgreSQL star schema with airline, airport, route, and date dimensions.
- Published passenger, seat, and departure shares, load factor, and an explicitly uncalibrated nonstop QSI proxy.
- Published the light Flightpath dashboard on Vercel with airline colors and PNG marks, plus a documented design and mark provenance.
- Activated the weekly GitHub Actions refresh. The [first end-to-end run](https://github.com/David2390/bts-t100-market-share/actions/runs/43356230918) succeeded.

## Next editorial steps

- Select five competitive routes using complete route-month denominators and write a short commercial brief about the observed patterns.
- Add a dated interpretation when later 2026 BTS months are published. Keep observed passenger traffic separate from the schedule-based QSI proxy and itinerary demand.
- Connect the GitHub repository to Vercel for automatic dashboard code deployments when the account's GitHub integration is available. Data refreshes already flow to the live dashboard without a site redeploy.

## Acceptance criteria
- Figures trace to official source exports and the [quality report](../reports/data-quality.json).
- Share denominators include all included reporting competitors.
- Missing denominators remain blank, not fabricated zeroes.
- The dashboard identifies partial-year coverage and the QSI proxy's limitations.
- A fresh checkout can reproduce the transforms using the documented commands and required private credentials.
