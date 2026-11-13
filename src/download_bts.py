"""Download real BTS annual exports through the official TranStats form."""
import html,http.cookiejar,re,time,urllib.parse,urllib.request,zipfile
from datetime import datetime,timezone
from pathlib import Path

SOURCE_URL='https://www.transtats.bts.gov/DL_SelectFields.aspx?QO_fu146_anzr=Nv4+Pn44vr45&gnoyr_VQ=GEE'


def download(root,year):
    opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    page=opener.open(SOURCE_URL,timeout=90).read().decode()
    params={}
    for tag in re.findall(r'<input\b[^>]*>',page,re.I):
        attrs=dict(re.findall(r'(\w+)="([^"]*)"',tag))
        name=attrs.get('name','')
        if attrs.get('type')=='hidden' and name:
            params[name]=html.unescape(attrs.get('value',''))
        if attrs.get('type')=='checkbox' and name.isupper():
            params[name]='on'
    params.update(cboGeography='All',cboYear=str(year),cboPeriod='All',btnDownload='Download')
    target=root/'data/raw'/f'bts_{year}.zip';target.parent.mkdir(parents=True,exist_ok=True)
    temporary=target.with_suffix('.partial')
    with opener.open(SOURCE_URL,urllib.parse.urlencode(params).encode(),timeout=240) as response, temporary.open('wb') as output:
        while chunk:=response.read(1024*1024): output.write(chunk)
    if not zipfile.is_zipfile(temporary):
        temporary.unlink(missing_ok=True)
        raise ValueError('BTS did not return a ZIP export; inspect the download form')
    with zipfile.ZipFile(temporary) as archive:
        if archive.testzip() is not None: raise ValueError('Invalid source ZIP')
    temporary.replace(target)
    print(f'Downloaded BTS {year}: {target.stat().st_size:,} bytes',flush=True)


if __name__=='__main__':
    root=Path(__file__).resolve().parents[1]
    for year in (2025,2026):
        for attempt in range(3):
            try: download(root,year);break
            except Exception:
                if attempt==2: raise
                time.sleep(5*(attempt+1))