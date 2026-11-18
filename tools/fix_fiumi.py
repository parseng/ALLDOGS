"""Toglie la particolarità "fiumi" dai sentieri dove l'acqua vera non c'è.

Prima contavano anche i torrenti che passano sotto la città (in galleria o tombati) e quelli quasi sempre asciutti
(intermittent=yes in OpenStreetMap, per esempio il torrente di San Rocco al Bosco di Capodimonte a Napoli):
chi sceglie il filtro "Fiumi" non se li aspetta.
Lo script riscarica solo i fiumi/torrenti all'aperto delle zone che hanno sentieri con "fiumi" e ricontrolla
quei sentieri con la stessa regola di build_feats.py. Non aggiunge niente: toglie soltanto.

Uso:
  python tools/fix_fiumi.py fetch     # scarica (riprende da dove era rimasto)
  python tools/fix_fiumi.py apply     # riscrive data/c/ togliendo i "fiumi" sbagliati
"""
import json, os, re, sys, time

import build_data as bd
import build_italy as bi
from build_feats import Lines, nice_name

RAW = os.path.join(bi.RAW, "fiumi-aperto")
OUT = os.path.join(bd.ROOT, "data", "c")


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def celle_con_fiumi():
    out = []
    for fn in sorted(os.listdir(OUT)):
        if not fn.endswith(".json"):
            continue
        tr = json.load(open(os.path.join(OUT, fn), encoding="utf-8"))["trails"]
        if any("fiumi" in ((t.get("f") or {}).get("f") or []) for t in tr):
            a, b = fn[:-5].split("_")
            out.append((float(a), float(b)))
    return out


def fetch():
    os.makedirs(RAW, exist_ok=True)
    cc = celle_con_fiumi()
    for n, c in enumerate(cc):
        k = bi.key(c)
        dst = os.path.join(RAW, f"{k}.json")
        if os.path.exists(dst):
            continue
        m = .03
        B = f"{c[0] - m},{c[1] - m},{c[0] + bi.CELL + m},{c[1] + bi.CELL + m}"
        q = (f'[out:json][timeout:300];('
             f'way["waterway"~"^(river|stream)$"]["name"]["tunnel"!~"."]["location"!~"underground"]["layer"!~"^-"]({B});'
             f'way["natural"="water"]["water"~"river|stream|canal"]["tunnel"!~"."]({B});'
             f');out tags geom;')
        log(f"[{n + 1}/{len(cc)}] {k}")
        if not bi.curl_overpass(q, dst):
            log("   saltato per ora")
    log("finito")


def acqua(c):
    L = Lines()
    f = os.path.join(RAW, f"{bi.key(c)}.json")
    if not os.path.exists(f):
        return None
    for el in json.load(open(f, encoding="utf-8"))["elements"]:
        g = el.get("geometry")
        if not g:
            continue
        t = el.get("tags", {})
        if t.get("intermittent") == "yes" or t.get("seasonal") == "yes" or t.get("ephemeral") == "yes":
            continue  # torrenti quasi sempre asciutti: per chi cerca "fiumi" non c'è acqua
        L.add([[p["lat"], p["lon"]] for p in g], ("f", nice_name(t)))
    return L


def lungo_acqua(ways, L):
    path = [p for w in ways for p in w]
    ln = sum(bd.hav(path[i - 1], path[i]) for i in range(1, len(path)))
    sm = bd.resample(path, 40) if ln > 0 else path
    if len(sm) < 2:
        return False
    seg = ln / max(1, len(sm))
    along = sum(seg for p in sm if L.near(p, 70))
    return along >= 400 or (ln and along / ln >= .2 and along >= 150)


def togli_frase(d):
    # "Costeggia il torrente X." oppure "Costeggia il torrente X, arriva vicino..." / "... e passa accanto..."
    d2 = re.sub(r"Costeggia [^.,]*?(?: e ([a-zà-ù]))", lambda m: m.group(1).upper(), d, count=1)
    if d2 == d:
        d2 = re.sub(r"Costeggia [^.,]*?, ([a-zà-ù])", lambda m: m.group(1).upper(), d, count=1)
    if d2 == d:
        d2 = re.sub(r"\s*Costeggia [^.]*\.", "", d, count=1)
    return d2


def apply():
    tot = tolti = 0
    for c in celle_con_fiumi():
        L = acqua(c)
        if L is None:
            log("manca", bi.key(c))
            continue
        fn = os.path.join(OUT, f"{bi.key(c)}.json")
        data = json.load(open(fn, encoding="utf-8"))
        cambiati = 0
        for t in data["trails"]:
            f = t.get("f") or {}
            if "fiumi" not in (f.get("f") or []):
                continue
            tot += 1
            ways = t["ways"] if isinstance(t["ways"], list) else json.loads(t["ways"])
            if lungo_acqua(ways, L):
                continue
            f["f"] = [x for x in f["f"] if x != "fiumi"]
            if f.get("n"):
                f["n"].pop("fiumi", None)
            if t.get("d"):
                t["d"] = togli_frase(t["d"])
                if not any(x in f["f"] for x in ("laghi", "spiaggia", "cascate")):
                    t["d"] = re.sub(r"\s*Dove l'acqua è calma[^.]*\.", "", t["d"])
            cambiati += 1
            log("  tolto:", t["name"])
        if cambiati:
            json.dump(data, open(fn, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
            tolti += cambiati
    log(f"sentieri con fiumi controllati: {tot}, tolti: {tolti}")


if __name__ == "__main__":
    {"fetch": fetch, "apply": apply}[sys.argv[1]]()
