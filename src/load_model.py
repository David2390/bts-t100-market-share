"""Load Python-built Parquet tables atomically into the Supabase star schema."""
import argparse,getpass,os,sys,json
from pathlib import Path
import pandas as pd
import psycopg
from psycopg import sql
from psycopg.types.json import Jsonb

TABLES=['dim_date','dim_airline','dim_airport','dim_route','fact_market_monthly','report_route_monthly']


def load(root,dsn):
    with psycopg.connect(dsn,sslmode='require',connect_timeout=30,prepare_threshold=None) as conn:
        conn.execute('select pg_advisory_xact_lock(100100)')
        for name in TABLES:
            df=pd.read_parquet(root/'data/parquet/gold'/f'{name}.parquet')
            stage='stage_'+name
            conn.execute(sql.SQL('create temp table {} (like aviation.{}) on commit drop').format(sql.Identifier(stage),sql.Identifier(name)))
            with conn.cursor().copy(sql.SQL('copy {} from stdin').format(sql.Identifier(stage))) as cp:
                for row in df.itertuples(index=False,name=None):
                    cp.write_row(tuple(None if pd.isna(v) else v for v in row))
            if name.startswith('dim_'):
                cols=list(df.columns); key=cols[0]
                updates=sql.SQL(',').join(sql.SQL('{}=excluded.{}').format(sql.Identifier(c),sql.Identifier(c)) for c in cols[1:])
                conn.execute(sql.SQL('insert into aviation.{} select * from {} on conflict ({}) do update set {}').format(sql.Identifier(name),sql.Identifier(stage),sql.Identifier(key),updates))
            else:
                # Replace complete downloaded years; validates coverage before this loader runs.
                if name=='fact_market_monthly':
                    conn.execute('delete from aviation.fact_market_monthly where year in (2025,2026)')
                else:
                    conn.execute('delete from aviation.report_route_monthly where date_key between 20250101 and 20261231')
                conn.execute(sql.SQL('insert into aviation.{} select * from {}').format(sql.Identifier(name),sql.Identifier(stage)))
            print(f'Loaded {name}: {len(df):,}',flush=True)
        metadata=json.loads((root/'reports/data-quality.json').read_text(encoding='utf-8'))
        conn.execute('insert into aviation.pipeline_status(id,payload) values (1,%s) on conflict(id) do update set payload=excluded.payload, refreshed_at=now()', (Jsonb(metadata),))
    print('Committed star schema load.',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1]);parser.add_argument('--prompt',action='store_true');args=parser.parse_args()
    if args.prompt:
        password=getpass.getpass('Loader password (hidden): ')
        dsn=f'postgresql://aviation_loader:{password}@db.zlzkijtsyrlisfjydnln.supabase.co:5432/postgres'
    else:
        dsn=os.environ['DATABASE_URL']
    try: load(args.root,dsn)
    except Exception as e:
        print(f'Database load failed ({type(e).__name__}). Transaction rolled back.',file=sys.stderr);sys.exit(1)