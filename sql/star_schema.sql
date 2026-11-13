create table aviation.dim_date (date_key bigint,
year bigint,
month bigint,
days_in_month bigint,
quarter bigint,
month_label text,
primary key (date_key));

alter table aviation.dim_date enable row level security;

grant select,insert,update,delete on aviation.dim_date to aviation_loader;

create policy loader_access on aviation.dim_date to aviation_loader using (true) with check (true);

grant select on aviation.dim_date to anon;

create policy public_read on aviation.dim_date for select to anon using (true);

create table aviation.dim_airline (airline_id bigint,
airline_code text,
airline_name text,
primary key (airline_id));

alter table aviation.dim_airline enable row level security;

grant select,insert,update,delete on aviation.dim_airline to aviation_loader;

create policy loader_access on aviation.dim_airline to aviation_loader using (true) with check (true);

grant select on aviation.dim_airline to anon;

create policy public_read on aviation.dim_airline for select to anon using (true);

create table aviation.dim_airport (airport_id bigint,
airport_code text,
city_name text,
state_code text,
primary key (airport_id));

alter table aviation.dim_airport enable row level security;

grant select,insert,update,delete on aviation.dim_airport to aviation_loader;

create policy loader_access on aviation.dim_airport to aviation_loader using (true) with check (true);

grant select on aviation.dim_airport to anon;

create policy public_read on aviation.dim_airport for select to anon using (true);

create table aviation.dim_route (route_key text,
origin_airport_id bigint,
destination_airport_id bigint,
primary key (route_key),
foreign key (origin_airport_id) references aviation.dim_airport(airport_id),
foreign key (destination_airport_id) references aviation.dim_airport(airport_id));

alter table aviation.dim_route enable row level security;

grant select,insert,update,delete on aviation.dim_route to aviation_loader;

create policy loader_access on aviation.dim_route to aviation_loader using (true) with check (true);

grant select on aviation.dim_route to anon;

create policy public_read on aviation.dim_route for select to anon using (true);

create table aviation.fact_market_monthly (year bigint,
month bigint,
airline_id bigint,
origin_airport_id bigint,
destination_airport_id bigint,
passengers double precision,
seats double precision,
departures double precision,
scheduled_departures double precision,
date_key bigint,
route_key text,
days_in_month bigint,
avg_aircraft_seats double precision,
qsi_score double precision,
passenger_share double precision,
seat_share double precision,
departure_share double precision,
qsi_share double precision,
load_factor double precision,
share_gap_pp double precision,
primary key (date_key, route_key, airline_id),
foreign key (date_key) references aviation.dim_date(date_key),
foreign key (airline_id) references aviation.dim_airline(airline_id),
foreign key (route_key) references aviation.dim_route(route_key),
check (passengers >= 0 and seats > 0 and departures > 0 and scheduled_departures >= 0));

alter table aviation.fact_market_monthly enable row level security;

grant select,insert,update,delete on aviation.fact_market_monthly to aviation_loader;

create policy loader_access on aviation.fact_market_monthly to aviation_loader using (true) with check (true);

grant select on aviation.fact_market_monthly to anon;

create policy public_read on aviation.fact_market_monthly for select to anon using (true);

create table aviation.report_route_monthly (date_key bigint,
route_key text,
passengers double precision,
seats double precision,
departures double precision,
airlines bigint,
origin_airport_id bigint,
destination_airport_id bigint,
qsi_score double precision,
load_factor double precision,
route_label text,
origin_city text,
destination_city text,
primary key (date_key, route_key));

alter table aviation.report_route_monthly enable row level security;

grant select,insert,update,delete on aviation.report_route_monthly to aviation_loader;

create policy loader_access on aviation.report_route_monthly to aviation_loader using (true) with check (true);

grant select on aviation.report_route_monthly to anon;

create policy public_read on aviation.report_route_monthly for select to anon using (true);

grant usage on schema aviation to anon;

create index fact_route_period on aviation.fact_market_monthly(route_key,date_key);

create index route_report_period_volume on aviation.report_route_monthly(date_key,passengers desc);

create view public.aviation_periods with (security_invoker=true) as select * from aviation.dim_date;

create view public.aviation_routes with (security_invoker=true) as select * from aviation.report_route_monthly;

create view public.aviation_market_share with (security_invoker=true) as
select f.*,a.airline_code,a.airline_name from aviation.fact_market_monthly f join aviation.dim_airline a using (airline_id);

grant select on public.aviation_periods, public.aviation_routes, public.aviation_market_share to anon;