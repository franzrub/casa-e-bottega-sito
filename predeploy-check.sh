#!/usr/bin/env bash
# ============================================================================
# predeploy-check.sh — GATE per Casa e Bottega B&B
# ============================================================================
# Controlla SOLO cose oggettivamente verificabili (link rotti, parità
# sito/deploy, chiavi i18n mancanti, file .min vecchi, cache-buster ?v=).
# NON giudica design o testi: quelli restano decisione umana.
#
# Uso:
#   ./predeploy-check.sh           # esegue il gate, esce 1 se ci sono FAIL
#   ./predeploy-check.sh --strict  # fa fallire anche sui WARN
#
# Exit code: 0 = gate superato, 1 = gate fallito (qualcosa va sistemato).
# ============================================================================
set -euo pipefail
cd "$(dirname "$0")"

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

STRICT=$STRICT python3 - <<'PYEOF'
import os, re, sys, glob, urllib.parse

STRICT = os.environ.get("STRICT", "0") == "1"

RED, GRN, YEL, BLU, BOLD, RST = "\033[31m","\033[32m","\033[33m","\033[34m","\033[1m","\033[0m"
fails, warns = [], []
def FAIL(msg): fails.append(msg)
def WARN(msg): warns.append(msg)

HTML = sorted(glob.glob("sito/**/*.html", recursive=True))
SKIP_LINK_SCHEMES = ("http://","https://","//","mailto:","tel:","#","javascript:","data:")

# ---------------------------------------------------------------------------
# 1) LINK INTERNI ROTTI nell'artefatto pubblicato (deploy/ = ciò che Netlify serve)
#    Risolve i path contro la root deploy/, decodifica %20 ecc., e ignora i
#    riferimenti costruiti in JavaScript (es. src="' + img + '").
# ---------------------------------------------------------------------------
def looks_like_js(ref):
    return any(c in ref for c in ("'", "+", "{", "<", "\n"))

def resolve(src_file, ref, root):
    ref = ref.split("#",1)[0].split("?",1)[0]
    if not ref:
        return None
    ref = urllib.parse.unquote(ref)          # %20 -> spazio, come fa il browser
    if ref.startswith("/"):
        target = os.path.normpath(os.path.join(root, ref.lstrip("/")))
    else:
        target = os.path.normpath(os.path.join(os.path.dirname(src_file), ref))
    return target

DEPLOY_HTML = [p for p in glob.glob("deploy/**/*.html", recursive=True)
               if "blog-articolo" not in os.path.basename(p)]
broken = 0
attr_re = re.compile(r'(?:href|src)\s*=\s*"([^"]+)"')
for f in DEPLOY_HTML:
    txt = open(f, encoding="utf-8", errors="replace").read()
    for ref in attr_re.findall(txt):
        if ref.strip()=="" or ref.startswith(SKIP_LINK_SCHEMES) or looks_like_js(ref):
            continue
        t = resolve(f, ref, "deploy")
        if t is None:
            continue
        ok = os.path.isfile(t)
        if not ok and os.path.isdir(t):
            ok = os.path.isfile(os.path.join(t, "index.html"))
        if not ok:
            broken += 1
            if broken <= 40:
                FAIL(f"link rotto (live): {os.path.relpath(f,'deploy')}  ->  {ref}")
if broken > 40:
    FAIL(f"...e altri {broken-40} link rotti (totale {broken})")

# ---------------------------------------------------------------------------
# 2) CHIAVI i18n MANCANTI  (data-i18n usate nell'HTML ma assenti in i18n.js)
# ---------------------------------------------------------------------------
i18n_path = "sito/js/i18n.js"
defined = set()
if os.path.isfile(i18n_path):
    src = open(i18n_path, encoding="utf-8", errors="replace").read()
    for m in re.finditer(r'(?m)^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*', src):
        defined.add(m.group(1))
else:
    FAIL(f"manca {i18n_path}")

used = set()
key_re = re.compile(r'data-i18n[a-z-]*\s*=\s*"([^"]+)"')
for f in HTML:
    txt = open(f, encoding="utf-8", errors="replace").read()
    for k in key_re.findall(txt):
        used.add(k.strip())

missing = sorted(used - defined)
if missing:
    for k in missing[:40]:
        FAIL(f"chiave i18n usata ma non definita in i18n.js: {k}")
    if len(missing) > 40:
        FAIL(f"...e altre {len(missing)-40} chiavi i18n mancanti")

# ---------------------------------------------------------------------------
# 3) FILE .min VECCHI  (sorgente modificato dopo il .min in deploy/)
# ---------------------------------------------------------------------------
pairs = [
    ("sito/js/i18n.js",      "deploy/js/i18n.min.js"),
    ("sito/js/main.js",      "deploy/js/main.min.js"),
    ("sito/css/style-v2.css","deploy/css/style-v2.min.css"),
]
# Un .min conta solo se qualche pagina deploy lo referenzia davvero.
all_deploy_txt = "".join(open(p,encoding="utf-8",errors="replace").read() for p in DEPLOY_HTML)
for src, mn in pairs:
    base = os.path.basename(mn)
    referenced = base in all_deploy_txt
    if not os.path.isfile(src):
        WARN(f"sorgente assente: {src}"); continue
    if not os.path.isfile(mn):
        if referenced: FAIL(f"manca il file minificato referenziato: {mn}")
        continue
    if os.path.getmtime(src) > os.path.getmtime(mn):
        if referenced:
            FAIL(f".min vecchio E IN USO: {src} modificato dopo {mn} -> rigenera il .min e bumpa ?v=")
        else:
            WARN(f".min vecchio ma NON usato (orfano): {mn} non è referenziato da nessuna pagina live")

# ---------------------------------------------------------------------------
# 4) PARITA' sito/ <-> deploy/  (esclusi i file legacy blog-articolo-*)
# ---------------------------------------------------------------------------
def is_legacy(p):
    return "blog-articolo" in os.path.basename(p)

par_missing, par_diff = 0, 0
for f in HTML:
    if is_legacy(f):
        continue
    dep = "deploy/" + os.path.relpath(f, "sito")
    if not os.path.isfile(dep):
        par_missing += 1
        if par_missing <= 20:
            FAIL(f"file presente in sito/ ma assente in deploy/: {os.path.relpath(f,'sito')}")
        continue
    if open(f,encoding='utf-8',errors='replace').read() != open(dep,encoding='utf-8',errors='replace').read():
        par_diff += 1
        if par_diff <= 20:
            FAIL(f"sito/ e deploy/ DIVERSI (manca la doppia copia?): {os.path.relpath(f,'sito')}")
if par_missing > 20: FAIL(f"...e altri {par_missing-20} file mancanti in deploy/")
if par_diff > 20:    FAIL(f"...e altri {par_diff-20} file diversi tra sito/ e deploy/")

# ---------------------------------------------------------------------------
# 5) CACHE-BUSTER ?v=  (ogni asset deve avere UNA sola versione su tutto deploy)
# ---------------------------------------------------------------------------
assets = {
    "i18n.min.js":    re.compile(r'i18n\.min\.js\?v=([0-9]+)'),
    "main(.min).js":  re.compile(r'main(?:\.min)?\.js\?v=([0-9]+)'),
    "style-v2.min.css": re.compile(r'style-v2\.min\.css\?v=([0-9]+)'),
}
deploy_html = DEPLOY_HTML
for name, rx in assets.items():
    versions = {}
    for f in deploy_html:
        txt = open(f, encoding="utf-8", errors="replace").read()
        for v in rx.findall(txt):
            versions[v] = versions.get(v, 0) + 1
    if len(versions) > 1:
        detail = ", ".join(f"v={v} ({n} pagine)" for v,n in sorted(versions.items()))
        WARN(f"cache-buster incoerente per {name}: {detail} -> uniforma il ?v=")

# ---------------------------------------------------------------------------
# 6) STRINGHE VIETATE
# ---------------------------------------------------------------------------
for f in HTML + deploy_html:
    txt = open(f, encoding="utf-8", errors="replace").read()
    if "Pulizie finali" in txt:
        WARN(f"stringa vietata 'Pulizie finali' reintrodotta in {f}")

# ---------------------------------------------------------------------------
# REPORT
# ---------------------------------------------------------------------------
print(f"\n{BOLD}{BLU}=== PREDEPLOY GATE — Casa e Bottega ==={RST}")
print(f"HTML analizzati (sito/): {len(HTML)}  |  pagine deploy/: {len(deploy_html)}\n")

if warns:
    print(f"{YEL}{BOLD}WARN ({len(warns)}):{RST}")
    for w in warns: print(f"  {YEL}!{RST} {w}")
    print()

if fails:
    print(f"{RED}{BOLD}FAIL ({len(fails)}):{RST}")
    for x in fails: print(f"  {RED}✗{RST} {x}")
    print(f"\n{RED}{BOLD}GATE FALLITO.{RST} Sistema i FAIL prima di fare push.\n")
    sys.exit(1)

if STRICT and warns:
    print(f"{RED}{BOLD}GATE FALLITO (--strict): ci sono WARN da risolvere.{RST}\n")
    sys.exit(1)

if warns:
    print(f"{GRN}{BOLD}GATE OK{RST} (con {len(warns)} warning non bloccanti).\n")
else:
    print(f"{GRN}{BOLD}GATE OK — tutto pulito.{RST}\n")
sys.exit(0)
PYEOF
