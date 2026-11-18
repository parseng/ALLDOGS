"""Parchi e riserve d'Italia con la loro forma e i sentieri che ci stanno dentro (data/parks.json).

Nell'app: tocchi un parco (per esempio "Parco regionale del Matese") e vedi il parco evidenziato sulla mappa
e solo i suoi sentieri.

Uso:
  python tools/build_parks.py fetch    # elenco dei parchi e poi la forma di ciascuno (si può interrompere e riprendere)
  python tools/build_parks.py build    # semplifica le forme, trova i sentieri dentro, scrive data/parks.json

Fonte: OpenStreetMap (boundary=protected_area / national_park, leisure=nature_reserve), ODbL.
"""
import json, math, os, re, sys, time

import build_data as bd
import build_italy as bi

RAW = os.path.join(bi.RAW, "parchi")
OUT = os.path.join(bd.ROOT, "data", "parks.json")
CELLS = os.path.join(bd.ROOT, "data", "c")
ITALIA = "35.4,6.5,47.2,18.6"


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def fetch():
    os.makedirs(RAW, exist_ok=True)
    lst = os.path.join(RAW, "elenco.json")
    if not os.path.exists(lst):
        log("elenco dei parchi")
        q = (f'[out:json][timeout:600];area["ISO3166-1"="IT"][admin_level=2]->.it;('
             f'relation["boundary"~"^(protected_area|national_park)$"]["name"](area.it);'
             f'relation["leisure"="nature_reserve"]["name"](area.it);'
             f');out tags bb;')
        if not bi.curl_overpass(q, lst):
            log("elenco non scaricato"); return
    els = json.load(open(lst, encoding="utf-8"))["elements"]
    tieni = [e for e in els if buono(e.get("tags", {}))]
    log(f"parchi da scaricare: {len(tieni)} su {len(els)}")
    for n, e in enumerate(tieni):
        dst = os.path.join(RAW, f"{e['id']}.json")
        if os.path.exists(dst):
            continue
        log(f"[{n + 1}/{len(tieni)}] {e['tags'].get('name')}")
        if not bi.curl_overpass(f"[out:json][timeout:300];relation({e['id']});out geom;", dst):
            log("   saltato per ora")
    log("finito")


def buono(t):
    n = (t.get("name:it") or t.get("name") or "").lower()
    pc = t.get("protect_class", "")
    if t.get("boundary") == "national_park" or pc == "2":
        return True
    if re.search(r"\b(parco|riserva|oasi|bosco|foresta|area naturale|monumento naturale)\b", n) and pc not in ("6", "97", "98", "99", "14", "21", "22", "24"):
        return True
    return False


def anelli(rel):
    """Anelli esterni della relazione (le vie 'outer' unite in poligoni chiusi)."""
    segs = [[(p["lat"], p["lon"]) for p in m["geometry"]] for m in rel.get("members", []) if m.get("type") == "way" and m.get("role", "outer") in ("outer", "") and m.get("geometry")]
    out = []
    while segs:
        r = segs.pop(0)
        cambiato = True
        while cambiato and r[0] != r[-1]:
            cambiato = False
            for i, s in enumerate(segs):
                if s[0] == r[-1]: r += s[1:]
                elif s[-1] == r[-1]: r += s[::-1][1:]
                elif s[-1] == r[0]: r = s + r[1:]
                elif s[0] == r[0]: r = s[::-1] + r[1:]
                else: continue
                segs.pop(i); cambiato = True; break
        if len(r) >= 4:
            out.append(r)
    return out


def semplifica(pts, tol):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        dx, dy = b[1] - a[1], b[0] - a[0]
        L = math.hypot(dx, dy) or 1e-12
        d = abs(dy * (p[1] - a[1]) - dx * (p[0] - a[0])) / L
        if d > dmax:
            dmax, idx = d, i
    if dmax > tol:
        return semplifica(pts[:idx + 1], tol)[:-1] + semplifica(pts[idx:], tol)
    return [a, b]


def dentro(p, ring):
    x, y, ins = p[1], p[0], False
    for i in range(len(ring)):
        a, b = ring[i], ring[i - 1]
        if (a[0] > y) != (b[0] > y) and x < (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0]) + a[1]:
            ins = not ins
    return ins


def area(ring):
    k = math.cos(math.radians(ring[0][0]))
    return abs(sum((ring[i - 1][1] * k) * ring[i][0] - (ring[i][1] * k) * ring[i - 1][0] for i in range(len(ring)))) / 2 * 111.32 ** 2


def build():
    sentieri = []
    for fn in os.listdir(CELLS):
        if fn.endswith(".json"):
            for t in json.load(open(os.path.join(CELLS, fn), encoding="utf-8"))["trails"]:
                ways = t["ways"] if isinstance(t["ways"], list) else json.loads(t["ways"])
                pts = [p for w in ways for p in w]
                if pts:
                    sentieri.append((t["id"], fn[:-5], pts[::max(1, len(pts) // 12)], t.get("name", "")))
    log(f"sentieri: {len(sentieri)}")
    parchi = []
    for fn in os.listdir(RAW):
        if not re.match(r"^\d+\.json$", fn):
            continue
        els = json.load(open(os.path.join(RAW, fn), encoding="utf-8")).get("elements", [])
        if not els:
            continue
        rel = els[0]
        t = rel.get("tags", {})
        nome = (t.get("name:it") or t.get("name") or "").strip()
        rr = anelli(rel)
        if not rr or not nome:
            continue
        km2 = sum(area(r) for r in rr)
        if km2 < 0.3:
            continue
        lats = [p[0] for r in rr for p in r]; lons = [p[1] for r in rr for p in r]
        bb = [min(lats), min(lons), max(lats), max(lons)]
        ids, celle = [], set()
        for (sid, cell, pts, _) in sentieri:
            if pts[0][0] < bb[0] - .01 or pts[0][0] > bb[2] + .01 or pts[0][1] < bb[1] - .01 or pts[0][1] > bb[3] + .01:
                continue
            n_in = sum(1 for p in pts if any(dentro(p, r) for r in rr))
            if n_in >= max(1, len(pts) * .5):
                ids.append(sid); celle.add(cell)
        if len(ids) < 2:
            continue
        tol = .0008 if km2 < 50 else .0015 if km2 < 500 else .003
        forma = [[[round(p[0], 4), round(p[1], 4)] for p in semplifica(r, tol)] for r in rr if area(r) > km2 * .01]
        # in OpenStreetMap anche molti parchi regionali hanno protect_class=2: decide il nome
        tipo = "nazionale" if re.search(r"parco nazionale|national park|nationalpark", nome, re.I) else \
            "regionale" if re.search(r"parco (naturale )?regionale|parco naturale|^parco (del|dei|della|delle|degli|di|dell)\b", nome, re.I) else \
            "riserva" if re.search(r"riserva|oasi", nome, re.I) else "parco"
        parchi.append({"id": rel["id"], "n": nome, "k": tipo, "km2": round(km2), "bb": [round(x, 4) for x in bb],
                       "c": [round((bb[0] + bb[2]) / 2, 4), round((bb[1] + bb[3]) / 2, 4)], "s": ids, "cl": sorted(celle), "g": forma})
    ordine = {"nazionale": 0, "regionale": 1, "parco": 2, "riserva": 3}
    parchi.sort(key=lambda p: (ordine[p["k"]], -len(p["s"])))
    json.dump({"t": int(time.time()), "parks": parchi}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    log(f"parchi con sentieri: {len(parchi)} -> {OUT} ({os.path.getsize(OUT) // 1024} KB)")


if __name__ == "__main__":
    {"fetch": fetch, "build": build}[sys.argv[1]]()
