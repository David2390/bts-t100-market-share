# How the Flightpath QSI proxy works

Flightpath compares **observed passenger share** with a **schedule-and-aircraft-size benchmark** for each directional nonstop route and calendar month. We call the benchmark a *QSI proxy* because it borrows the idea that frequency and aircraft size affect a schedule's competitive presence. It is an explicit portfolio formula, not an industry-standard or calibrated Quality of Service Index. No passenger outcomes are used to fit the score.

## Grain and eligible service

One fact row represents one BTS reporting airline (`AIRLINE_ID`) on one directional origin–destination airport pair in one month. `JFK → LAX` and `LAX → JFK` are separate markets. The Python pipeline uses BTS T-100 Domestic Segment, retaining scheduled passenger/cargo service (`CLASS = F`) with passenger-configured aircraft (`AIRCRAFT_CONFIG = 1`), different origin and destination airports, positive seats, and positive performed departures. Zero-passenger operated service remains in the market. Reporting operators are not merged into marketing brands.

For each airline-route-month, source rows are summed into passengers, seats, performed departures, and scheduled departures. The average aircraft size is **seats ÷ performed departures**. This is an average of seats offered per flight actually operated, not a published seat count for each scheduled flight.

## Formula

For airline `a` on directional route `r` in month `m`:

```text
average_seats_a = operated_seats_a / performed_departures_a
frequency_a     = scheduled_departures_a / days_in_month_m
score_a         = frequency_a × sqrt(average_seats_a / 150)
QSI_proxy_share_a = score_a / sum(score_i for all included reporting airlines i on r,m)
passenger_share_a = passengers_a / sum(passengers_i for all included airlines i on r,m)
gap_pp_a          = 100 × (passenger_share_a - QSI_proxy_share_a)
```

The calculation is in [`src/build_model.py`](../src/build_model.py). **150 seats** is a reference aircraft size: a 150-seat average gives a size factor of 1. It does not change the relative shares within the same route-month because every airline uses the same reference. Similarly, dividing each airline's monthly departures by the same number of days does not change that month's relative shares. Those terms make the raw score easier to read and compare; they do not introduce fitted weights.

Frequency enters linearly: twice as many scheduled departures, holding aircraft size fixed, gives twice the score. Aircraft size enters through a square root: twice the average seats, holding frequency fixed, gives about 1.41 times the score. This deliberately gives frequency more influence than gauge. That choice is a modeling assumption, not an estimated passenger response.

## Worked example

Suppose a 30-day route-month has two reporting airlines:

| Airline | Scheduled departures | Average seats per performed departure | Score | Proxy share | Passengers | Passenger share | Gap |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 60 | 150 | `2 × sqrt(150/150) = 2.000` | 71.0% | 6,000 | 60.0% | −11.0 pp |
| B | 30 | 100 | `1 × sqrt(100/150) = 0.816` | 29.0% | 4,000 | 40.0% | +11.0 pp |

The scores sum to about 2.816, so A's proxy share is `2 / 2.816 ≈ 71.0%`. A carried 60% of observed passengers. The **−11 percentage-point gap** says its passenger share was lower than this particular schedule-and-gauge benchmark. B's positive gap says the reverse. Neither gap proves a fare, brand, time-of-day, connection, capacity, or profitability effect.

## How to interpret the measures

- **Passenger share** is an outcome: the fraction of included BTS nonstop segment passengers carried by the reporting airline on that route in that month. It is not full origin–destination itinerary demand.
- **QSI proxy share** is an offer-side benchmark derived from scheduled frequency and operated aircraft gauge. It is not a prediction of passenger share.
- **Gap in percentage points** highlights where observed traffic and the benchmark differ. A positive gap is a prompt to investigate, not evidence of unmet demand or superior economics.
- **Seat share**, **departure share**, and **load factor** are separate descriptive measures. Load factor uses observed passengers ÷ operated seats; it is not an input to the QSI score.

## Missing values and quality limits

An airline with zero reported scheduled departures gets a zero score if another included airline has a positive score. If every included airline on a route-month has zero scheduled departures, the proxy-share denominator is zero and all proxy shares and gaps are unavailable (`NULL`/`N/A`). If the total passenger denominator is zero, passenger share and gap are unavailable. The pipeline does not replace missing shares with zero. It checks that shares sum to one where a positive denominator exists.

The proxy combines **scheduled departures** with **aircraft size inferred from performed departures**; cancellations and schedule/reporting differences can make these unlike bases. BTS T-100 has no departure time, fare, itinerary connection, booking curve, loyalty, product, or marketing-carrier attribution in this model. Aircraft size is only a coarse capacity signal. Route-month comparisons should include all eligible reporting operators and should align months across years. The project retains and flags source anomalies, including airline-route-month records with passengers above seats.

For the BTS source, filters, coverage, and provenance, see [data-source.md](data-source.md). For exact fields and output, see the [project README](../README.md) and [quality report](../reports/data-quality.json).
