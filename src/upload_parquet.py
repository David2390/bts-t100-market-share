"""Upload a private, versioned Parquet snapshot to Supabase S3 storage."""
import json,os
from datetime import datetime,timezone
from pathlib import Path
import boto3
from botocore.config import Config


def upload(root):
    client=boto3.client('s3',endpoint_url='https://zlzkijtsyrlisfjydnln.storage.supabase.co/storage/v1/s3',
        region_name='us-east-1',aws_access_key_id=os.environ['SUPABASE_S3_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['SUPABASE_S3_SECRET_ACCESS_KEY'],
        config=Config(signature_version='s3v4',s3={'addressing_style':'path'},retries={'max_attempts':3,'mode':'standard'}))
    bucket='aviation-parquet'
    prefix='snapshots/'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'/'
    objects=[]
    for path in sorted((root/'data/parquet').rglob('*.parquet')):
        key=prefix+path.relative_to(root/'data/parquet').as_posix()
        with path.open('rb') as body:
            client.put_object(Bucket=bucket,Key=key,Body=body,ContentType='application/vnd.apache.parquet')
        objects.append({'key':key,'bytes':path.stat().st_size})
    manifest_path=root/'reports/data-quality.json'
    metadata=json.loads(manifest_path.read_text(encoding='utf-8'))
    metadata['storage_prefix']=prefix
    metadata['snapshot_created_at']=datetime.now(timezone.utc).isoformat()
    manifest=json.dumps({'prefix':prefix,'objects':objects,'quality':metadata},indent=2).encode()
    client.put_object(Bucket=bucket,Key=prefix+'manifest.json',Body=manifest,ContentType='application/json')
    client.put_object(Bucket=bucket,Key='latest.json',Body=manifest,ContentType='application/json')
    manifest_path.write_text(json.dumps(metadata,indent=2),encoding='utf-8')
    # Keep the current and previous snapshots; never touch the initial root-level files.
    pages=client.get_paginator('list_objects_v2').paginate(Bucket=bucket,Prefix='snapshots/',Delimiter='/')
    prefixes=sorted(p['Prefix'] for page in pages for p in page.get('CommonPrefixes',[]))
    for stale in prefixes[:-2]:
        for page in client.get_paginator('list_objects_v2').paginate(Bucket=bucket,Prefix=stale):
            keys=[{'Key':item['Key']} for item in page.get('Contents',[])]
            if keys: client.delete_objects(Bucket=bucket,Delete={'Objects':keys})
    print(f'Uploaded {len(objects)} Parquet objects to {prefix}; retained two snapshots.')


if __name__=='__main__':
    upload(Path(__file__).resolve().parents[1])