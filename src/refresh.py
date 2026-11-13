"""Run the current Parquet/star-schema refresh pipeline."""
from pathlib import Path
from download_bts import download
from build_model import build
from load_model import load
import os

if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    for year in (2025,2026): download(root,year)
    build(root)
    load(root,os.environ['DATABASE_URL'])