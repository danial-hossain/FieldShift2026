import urllib.request
import urllib.error
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

urls = [
    ("DAM", "https://market.dam.gov.bd/"),
    ("Sadai", "https://sadai.gov.bd/"),
    ("TCB", "https://tcb.gov.bd/"),
    ("BAMIS", "https://www.bamis.gov.bd/"),
    ("NASA POWER", "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,PRECTOTCORR&community=AG&longitude=90.41&latitude=23.81&start=20240101&end=20240105&format=JSON"),
]

for name, url in urls:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        with urllib.request.urlopen(req, timeout=5, context=ctx) as resp:
            print(f"[{name}] {url} -> Status {resp.status}, length: {len(resp.read())}")
    except Exception as e:
        print(f"[{name}] {url} -> FAILED: {type(e).__name__}: {e}")
