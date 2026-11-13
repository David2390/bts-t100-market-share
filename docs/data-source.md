# Source, coverage and provenance

Publisher: US Department of Transportation, Bureau of Transportation Statistics.
Dataset: T-100 Domestic Segment (All Carriers).
Official export form: https://www.transtats.bts.gov/DL_SelectFields.aspx?QO_fu146_anzr=Nv4+Pn44vr45&gnoyr_VQ=GEE

The downloader submits All geography, All months, each source year, and all dataset fields. It preserves ASP.NET form tokens and cookies. It checks that the response is a valid ZIP with one CSV before transformation.

Initial verified downloads (November 12, 2026, Bolivia time):

| Year | Source rows | Coverage | Raw CSV bytes | Bronze Parquet bytes |
|---|---:|---|---:|---:|
| 2025 | 458,768 | January–December | 127,158,607 | 13,967,824 |
| 2026 | 307,438 | January–August | 85,293,064 | 9,550,314 |

The live download form listed August 2026; the downloaded records confirmed months 1–8. Search-engine caches had older release information, so record-level coverage takes precedence. Up to date means latest published BTS records, not flights through today.

See reports/data-quality.json for source ZIP SHA-256 hashes, row counts and validation results.

## Scope and exclusions
Filter service CLASS=F (scheduled passenger/cargo service), AIRCRAFT_CONFIG=1 (passenger configuration), distinct origin/destination airport IDs, positive available seats and positive performed departures. Retain zero-passenger operated services. The excluded-source-row count covers all filters; it is not a count of invalid records.

Use AIRLINE_ID as reporting-airline key and airport IDs for stable airport/route keys. The dimensional labels describe the latest observed name in these exports; they are not a slowly changing historical name model. Operators such as SkyWest remain separate from the airlines that market some of their flights.

QSI requires schedule quality assumptions. This project uses a documented, uncalibrated nonstop proxy based on scheduled frequency and aircraft gauge; see the [full formula, worked example, and interpretation](qsi-methodology.md). No departure-time or connection-quality data is present. Eleven aggregate observations report passengers above seats; these are source-quality flags, not corrections. Some route-months have no usable scheduled departures and their QSI share is null.

## Revisions and limits
BTS can revise historical periods; weekly refreshes re-download both years. Whole-year and year-to-date comparisons must align periods. T-100 reports actual nonstop segment traffic, including passengers connecting elsewhere; it is not complete itinerary demand, revenue, fare, or profitability data.
