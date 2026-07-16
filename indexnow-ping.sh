#!/bin/bash
# indexnow-ping.sh — notifica IndexNow (Bing & co.) degli URL del sito.
#
# Uso:
#   ./indexnow-ping.sh                 → invia TUTTI gli URL del sitemap
#   ./indexnow-ping.sh URL1 URL2 ...   → invia solo gli URL indicati
#
# Da eseguire DOPO il push su GitHub (il file-chiave deve essere online).

set -e
cd "$(dirname "$0")"

HOST="www.casaebottegapuglia.it"
KEY="b85147356d0a22fae3f527b0e0d32f32"

python3 - "$@" <<'PY'
import json, re, sys, urllib.request

HOST = "www.casaebottegapuglia.it"
KEY = "b85147356d0a22fae3f527b0e0d32f32"

urls = sys.argv[1:]
if not urls:
    with open("deploy/sitemap.xml", encoding="utf-8") as f:
        urls = re.findall(r"<loc>([^<]+)</loc>", f.read())

payload = {
    "host": HOST,
    "key": KEY,
    "keyLocation": f"https://{HOST}/{KEY}.txt",
    "urlList": urls,
}

req = urllib.request.Request(
    "https://api.indexnow.org/indexnow",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json; charset=utf-8"},
)
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print(f"IndexNow: HTTP {r.status} — inviati {len(urls)} URL")
except urllib.error.HTTPError as e:
    print(f"IndexNow: HTTP {e.code} — {e.read().decode()[:200]}")
    sys.exit(1)
PY
