create table aviation.pipeline_status (id integer primary key check(id=1), payload jsonb not null, refreshed_at timestamptz not null default now());
alter table aviation.pipeline_status enable row level security;
grant select,insert,update on aviation.pipeline_status to aviation_loader;
create policy loader_access on aviation.pipeline_status to aviation_loader using (true) with check (true);
grant select on aviation.pipeline_status to anon;
create policy public_read on aviation.pipeline_status for select to anon using (true);
create view public.aviation_status with (security_invoker=true) as select payload,refreshed_at from aviation.pipeline_status;
grant select on public.aviation_status to anon;