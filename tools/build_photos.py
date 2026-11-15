# Foto vere dei sentieri, da Wikimedia Commons (solo licenze libere, con autore e licenza da citare).
# Per ogni riquadro di data/c/ cerca le foto con posizione GPS vicine al tracciato di ogni sentiero
# e scrive data/ph/<riquadro>.json = {id_sentiero: [{u, w, h, a, l, p}, ...]} (massimo 3 foto).
#   u = indirizzo dell'immagine (larga 640 px), a = autore, l = licenza, p = pagina della foto su Commons
# Uso: python tools/build_photos.py               (tutta Italia, riprende da dove si era fermato)
#      python tools/build_photos.py 40.5_14.0 ...  (solo questi riquadri)
# Usa curl (il Python di questo computer non riesce a verificare i certificati HTTPS).
import json, math, os, re, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CDIR, ODIR = os.path.join(HERE, "data", "c"), os.path.join(HERE, "data", "ph")
CACHE = os.path.join(HERE, "tools", ".cache_photos")
UA = "AllDogs/1.0 (https://parseng.github.io/ALLDOGS/)"
API = "https://commons.wikimedia.org/w/api.php?"
NEAR = 250          # metri massimi dal tracciato
SPLIT = 3           # ogni riquadro di mezzo grado diviso in 3x3 zone per la ricerca
BAD = re.compile(r"(map|mappa|carta|cartina|logo|stemma|coat.of.arms|flag|bandiera|plan|pianta|diagram|schema|segnale|cartello|sign|\.svg|\.pdf|\.tif|\.png|\.gif|interno|interior|altare|affresco|dipinto|painting|statua|statue|football|pitch|stadio|stadium|lapide|epigrafe|targa|plaque|museo|museum|antiquarium|collegiata|cattedrale|duomo|ritratto|portrait|selfie|ristorante|restaurant|hotel|treno|train|autobus|serie_fotografica|serie fotografica|tomba|sepolcro|campanile|facciata|portale|navata|crypt|cripta|ISS0[0-9]|View_of_Earth|View of Earth|NASA|satellite|Sentinel)", re.I)
GOOD = re.compile(r"(veduta|panoram|view|vista|sentiero|path|trail|hiking|bosco|forest|faggeta|monte|mount|valle|valley|cascat|waterfall|lago|lake|fiume|river|tramonto|sunset|cresta|ridge|vetta|summit|cima|costiera|coast|spiaggia|beach)", re.I)
STOP = set("di del della dei delle degli da a al alla il lo la le gli i e ed in per con su sentiero anello giro monte via strada percorso tratto ss sp cai".split())

def get(params, tries=4):
    url = API + urllib.parse.urlencode(params)
    for k in range(tries):
        r = subprocess.run(["curl", "-s", "-L", "--max-time", "40", "-A", UA, url], capture_output=True)
        try:
            return json.loads(r.stdout)
        except Exception:
            time.sleep(3 * (k + 1))
    return {}

def hav(a, b):
    R, r = 6371000, math.pi / 180
    dl, dn = (b[0] - a[0]) * r, (b[1] - a[1]) * r
    x = math.sin(dl / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin(dn / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))

def geo_files(cell):
    os.makedirs(CACHE, exist_ok=True)
    cp = os.path.join(CACHE, cell + ".json")
    if os.path.exists(cp):
        return json.load(open(cp, encoding="utf-8"))
    la0, lo0 = map(float, cell.split("_"))
    out, step = {}, 0.5 / SPLIT
    for i in range(SPLIT):
        for j in range(SPLIT):
            top, left = la0 + (i + 1) * step, lo0 + j * step
            d = get({"action": "query", "format": "json", "list": "geosearch", "gsnamespace": 6, "gslimit": 500,
                     "gsbbox": f"{top}|{left}|{top - step}|{left + step}"})
            for g in d.get("query", {}).get("geosearch", []):
                t = g["title"]
                if not re.search(r"\.jpe?g$", t, re.I) or BAD.search(t):
                    continue
                out[t] = [g["lat"], g["lon"]]
            time.sleep(0.25)
    json.dump(out, open(cp, "w", encoding="utf-8"), ensure_ascii=False)
    return out

def words(s):
    return {w for w in re.findall(r"[a-zàèéìòù]{4,}", (s or "").lower()) if w not in STOP}

def pick(trail, files):
    ways = trail["ways"] if isinstance(trail["ways"], list) else json.loads(trail["ways"])
    pts = [p for w in ways for p in w]
    if not pts:
        return []
    step = max(1, len(pts) // 80)
    pts = pts[::step]
    la = [p[0] for p in pts]; lo = [p[1] for p in pts]
    pad = 0.004
    box = (min(la) - pad, max(la) + pad, min(lo) - pad, max(lo) + pad)
    nw = words(trail.get("name")) | words(trail.get("from")) | words(trail.get("to"))
    cand = []
    for t, (a, b) in files.items():
        if not (box[0] <= a <= box[1] and box[2] <= b <= box[3]):
            continue
        if BAD.search(t):
            continue
        d = min(hav((a, b), p) for p in pts)
        if d > NEAR:
            continue
        # solo foto che parlano del posto: nome del sentiero, parole da paesaggio, oppure scattate proprio sul tracciato
        if not (nw & words(t) or GOOD.search(t) or d <= 80):
            continue
        bonus = (150 if nw & words(t) else 0) + (100 if GOOD.search(t) else 0)
        cand.append((d - bonus, t))
    cand.sort()
    return [t for _, t in cand[:6]]

def info(titles):
    res = {}
    for k in range(0, len(titles), 50):
        d = get({"action": "query", "format": "json", "prop": "imageinfo", "titles": "|".join(titles[k:k + 50]),
                 "iiprop": "url|extmetadata|size", "iiurlwidth": 640})
        for p in d.get("query", {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            m = ii.get("extmetadata", {})
            lic = m.get("LicenseShortName", {}).get("value", "")
            if not re.search(r"CC|Public domain|PD", lic, re.I) or (ii.get("width") or 0) < 800:
                continue
            art = re.sub(r"<[^>]+>", "", m.get("Artist", {}).get("value", "")).strip()[:80] or "autore su Commons"
            res[p["title"]] = {"u": ii.get("thumburl"), "w": ii.get("thumbwidth"), "h": ii.get("thumbheight"),
                               "a": art, "l": lic, "p": ii.get("descriptionurl")}
        time.sleep(0.25)
    return res

def do_cell(cell):
    trails = json.load(open(os.path.join(CDIR, cell + ".json"), encoding="utf-8"))["trails"]
    files = geo_files(cell)
    want = {t["id"]: pick(t, files) for t in trails}
    allt = sorted({x for v in want.values() for x in v})
    meta = info(allt) if allt else {}
    out = {}
    for tid, ts in want.items():
        ph = [meta[x] for x in ts if x in meta][:3]
        if ph:
            out[tid] = ph
    os.makedirs(ODIR, exist_ok=True)
    json.dump(out, open(os.path.join(ODIR, cell + ".json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    return len(trails), len(out), len(files)

if __name__ == "__main__":
    cells = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(CDIR) if f.endswith(".json"))
    for n, c in enumerate(cells, 1):
        if len(sys.argv) == 1 and os.path.exists(os.path.join(ODIR, c + ".json")):
            continue
        tot, got, nf = do_cell(c)
        print(f"[{n}/{len(cells)}] {c}: {got} sentieri su {tot} con foto ({nf} foto vicine)", flush=True)
    idx = {f[:-5]: 1 for f in os.listdir(ODIR) if f.endswith(".json")} if os.path.isdir(ODIR) else {}
    json.dump({"t": int(time.time()), "cells": idx}, open(os.path.join(ODIR, "index.json"), "w"), separators=(",", ":"))
    print("fatto")
