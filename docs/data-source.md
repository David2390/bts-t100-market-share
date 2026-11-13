# Source and acquisition

Publisher: US Department of Transportation, Bureau of Transportation Statistics (BTS).
Dataset: T-100 Domestic Segment (All Carriers).
Official download: https://www.transtats.bts.gov/DL_SelectFields.aspx?QO_fu146_anzr=Nv4+Pn44vr45&gnoyr_VQ=GEE

Select 2025, all months and all domestic geography. Include all airlines so market denominators retain competitors. Export these fields (or select all fields):

| BTS label | Common CSV header | Purpose |
|---|---|---|
| Year | YEAR | Period |
| Month | MONTH | Period |
| AirlineID | AIRLINE_ID | Stable reporting-airline identifier |
| UniqueCarrierName | UNIQUE_CARRIER_NAME | Optional display name |
| Origin | ORIGIN | Origin airport |
| Dest | DEST | Destination airport |
| Class | CLASS | Service class; pipeline retains F |
| Passengers | PASSENGERS | Transported segment passengers |
| Seats | SEATS | Available seats |
| DepPerformed | DEPARTURES_PERFORMED | Operated departures |

Extract a single CSV into data/raw/. Header spelling variants DepPerformed and AirlineID are also supported. No raw source rows are bundled with this repository.

Record the actual download date, selected filters, filename, coverage and source revisions below when acquired. Keep the original ZIP outside Git. Check coverage of all 12 months and review airlines with missing or unexpected reporting.

## Acquisition log
- Download date: pending
- File: pending
- Filters and period: pending
- Row count and SHA-256: pending

## Interpretation limits
T-100 reports nonstop segments, including passengers who may connect elsewhere. Aircraft/service detail can produce multiple rows for one airline-route-month; sum those rows, do not treat them as duplicates. Do not merge airline operators into brands without a documented mapping. Monthly seats and departures do not describe departure-time convenience or connection quality.