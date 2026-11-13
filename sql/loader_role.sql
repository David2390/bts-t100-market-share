-- Create before star_schema.sql; configure the password outside source control.
create role aviation_loader login;
grant usage on schema aviation to aviation_loader;
