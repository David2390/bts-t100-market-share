"""Build a reproducible T-100 star schema and monthly QSI proxy in Python."""
import argparse, calendar, hashlib, io, json, zipfile
from pathlib import Path
import pandas as pd


def build(root):
    data = []
    sources = []
    for year in (2025, 2026):
        path = root / 'data/raw' / f'bts_{year}.zip'
        if not path.exists():
            raise FileNotFoundError(path)
        with zipfile.ZipFile(path) as archive:
            csvs = [n for n in archive.namelist() if n.lower().endswith('.csv')]
            if len(csvs) != 1: raise ValueError('Expected one CSV')
            csv_bytes = archive.read(csvs[0])
            frame = pd.read_csv(io.BytesIO(csv_bytes), low_memory=False)
        if set(frame.YEAR.dropna().astype(int)) != {year}: raise ValueError('Incorrect source year')
        actual_months=set(frame.MONTH.dropna().astype(int))
        required=set(range(1,13)) if year==2025 else set(range(1,max(actual_months)+1))
        if actual_months != required: raise ValueError(f'Missing source months for {year}')
        sources.append(dict(year=year, rows=len(frame), months=sorted(frame.MONTH.unique().astype(int).tolist()),
                            csv_bytes=len(csv_bytes), zip_bytes=path.stat().st_size,
                            sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
        raw = root / 'data/parquet' / 'bronze' / f'year={year}'
        raw.mkdir(parents=True, exist_ok=True)
        frame.to_parquet(raw / 'traffic.parquet', index=False, compression='zstd')
        data.append(frame)
    source = pd.concat(data, ignore_index=True)
    # F = scheduled passenger/cargo service. Exclude cargo-only configurations.
    frame = source.loc[(source.CLASS == 'F') & (source.AIRCRAFT_CONFIG == 1) &
                       (source.ORIGIN_AIRPORT_ID != source.DEST_AIRPORT_ID)].copy()
    columns = ['PASSENGERS','SEATS','DEPARTURES_PERFORMED','DEPARTURES_SCHEDULED']
    if frame[columns].isna().any().any() or (frame[columns] < 0).any().any():
        raise ValueError('Missing or negative traffic measures')
    # Exclude non-service placeholder rows; retain zero-passenger services with capacity.
    frame = frame.loc[(frame.SEATS > 0) & (frame.DEPARTURES_PERFORMED > 0)]
    keys = ['YEAR','MONTH','AIRLINE_ID','ORIGIN_AIRPORT_ID','DEST_AIRPORT_ID']
    fact = frame.groupby(keys, as_index=False)[columns].sum()
    fact.columns = ['year','month','airline_id','origin_airport_id','destination_airport_id',
                    'passengers','seats','departures','scheduled_departures']
    fact['date_key'] = fact.year * 10000 + fact.month * 100 + 1
    fact['route_key'] = fact.origin_airport_id.astype(str) + '-' + fact.destination_airport_id.astype(str)
    fact['days_in_month'] = [calendar.monthrange(y,m)[1] for y,m in zip(fact.year,fact.month)]
    fact['avg_aircraft_seats'] = fact.seats / fact.departures
    # Transparent, uncalibrated nonstop-only QSI proxy. No passenger outcome enters score.
    fact['qsi_score'] = (fact.scheduled_departures / fact.days_in_month) * (fact.avg_aircraft_seats / 150.0) ** 0.5
    market = fact.groupby(['date_key','route_key'])
    for name,col in [('passenger_share','passengers'),('seat_share','seats'),
                     ('departure_share','departures'),('qsi_share','qsi_score')]:
        denominator = market[col].transform('sum')
        fact[name] = fact[col].div(denominator.where(denominator > 0))
    fact['load_factor'] = fact.passengers / fact.seats
    fact['share_gap_pp'] = 100 * (fact.passenger_share-fact.qsi_share)
    airlines = frame[['AIRLINE_ID','UNIQUE_CARRIER','UNIQUE_CARRIER_NAME']].drop_duplicates('AIRLINE_ID', keep='last')
    airlines.columns = ['airline_id','airline_code','airline_name']
    airports = []
    for prefix in ['ORIGIN','DEST']:
        a=frame[[f'{prefix}_AIRPORT_ID',prefix,f'{prefix}_CITY_NAME',f'{prefix}_STATE_ABR']].copy()
        a.columns=['airport_id','airport_code','city_name','state_code'];airports.append(a)
    airports=pd.concat(airports).drop_duplicates('airport_id',keep='last')
    routes=fact[['route_key','origin_airport_id','destination_airport_id']].drop_duplicates()
    dates=fact[['date_key','year','month','days_in_month']].drop_duplicates().sort_values('date_key')
    dates['quarter'] = (dates.month-1)//3+1
    dates['month_label'] = [f'{y}-{m:02}' for y,m in zip(dates.year,dates.month)]
    report_routes=fact.groupby(['date_key','route_key'],as_index=False).agg(passengers=('passengers','sum'),seats=('seats','sum'),departures=('departures','sum'),airlines=('airline_id','nunique'),origin_airport_id=('origin_airport_id','first'),destination_airport_id=('destination_airport_id','first'),qsi_score=('qsi_score','sum'))
    report_routes['load_factor']=report_routes.passengers/report_routes.seats
    airport_lookup=airports.set_index('airport_id')
    report_routes['route_label']=[airport_lookup.loc[o,'airport_code']+' → '+airport_lookup.loc[d,'airport_code'] for o,d in zip(report_routes.origin_airport_id,report_routes.destination_airport_id)]
    report_routes['origin_city']=report_routes.origin_airport_id.map(airport_lookup.city_name)
    report_routes['destination_city']=report_routes.destination_airport_id.map(airport_lookup.city_name)
    gold=root/'data/parquet/gold';gold.mkdir(parents=True,exist_ok=True)
    tables={'fact_market_monthly':fact,'dim_airline':airlines,'dim_airport':airports,'dim_route':routes,'dim_date':dates,'report_route_monthly':report_routes}
    for name,df in tables.items():
        if name.startswith('dim_') and df.iloc[:,0].duplicated().any(): raise ValueError(f'Duplicate {name} key')
        df.to_parquet(gold/f'{name}.parquet',index=False,compression='zstd')
    checks={}
    for col in ['passenger_share','seat_share','departure_share','qsi_share']:
        sums=fact.groupby(['date_key','route_key'])[col].sum(min_count=1).dropna()
        error=float((sums-1).abs().max())
        if error>1e-9: raise ValueError(f'Invalid share denominator: {col}')
        checks[col+'_max_sum_error']=error
    if fact.duplicated(['date_key','route_key','airline_id']).any(): raise ValueError('Duplicate fact grain')
    for source_info in sources:
        year=source_info['year'];source_info['bronze_parquet_bytes']=(root/'data/parquet/bronze'/f'year={year}'/'traffic.parquet').stat().st_size
    metadata={'sources':sources,'fact_rows':len(fact),'airlines':len(airlines),'routes':len(routes),
              'airports':len(airports),'latest_period':dates.month_label.max(),'checks':checks,
              'passengers_above_seats_rows':int((fact.passengers>fact.seats).sum()),'qsi_unavailable_rows':int(fact.qsi_share.isna().sum()),'excluded_source_rows':len(source)-len(frame),'qsi_formula':'scheduled_departures / days_in_month * sqrt(avg_aircraft_seats / 150)',
              'qsi_note':'Uncalibrated nonstop schedule-and-gauge proxy; not a commercial itinerary QSI model.'}
    report=root/'reports';report.mkdir(exist_ok=True)
    (report/'data-quality.json').write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    print(json.dumps(metadata,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    build(parser.parse_args().root)