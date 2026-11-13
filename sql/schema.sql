-- Bootstrap schema, applied through the Supabase migration API.
create schema if not exists aviation;
revoke all on schema aviation from public;
create table aviation.refresh_runs (
 id bigint generated always as identity primary key,
 source_year integer not null,
 source_url text not null,
 source_sha256 text not null,
 loaded_rows integer not null check (loaded_rows > 0),
 completed_at timestamptz not null default now()
);
create table aviation.monthly_traffic (
 year integer not null check (year between 1900 and 2100),
 month integer not null check (month between 1 and 12),
 origin text not null,
 destination text not null,
 airline_id text not null,
 passengers numeric not null check (passengers >= 0),
 seats numeric not null check (seats >= 0),
 departures numeric not null check (departures >= 0),
 primary key (year, month, origin, destination, airline_id)
);
alter table aviation.refresh_runs enable row level security;
alter table aviation.monthly_traffic enable row level security;
create view aviation.market_share with (security_invoker = true) as
with shares as (
 select *,
 passengers / nullif(sum(passengers) over market, 0) as passenger_share,
 seats / nullif(sum(seats) over market, 0) as seat_share,
 departures / nullif(sum(departures) over market, 0) as departure_share,
 passengers / nullif(seats, 0) as load_factor
 from aviation.monthly_traffic
 window market as (partition by year, month, origin, destination)
)
select *, 100 * (passenger_share - seat_share) as share_gap_pp from shares;
-- No Data API exposure or browser grants. Vercel will use a dedicated
-- server-side read-only database role once the dashboard is implemented.