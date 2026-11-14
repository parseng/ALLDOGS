"""Sentieri di tutta Italia, divisi in riquadri di mezzo grado (data/c/<lat>_<lon>.json + data/index.json).

Uso:
  python tools/build_italy.py fetch   # scarica i dati grezzi da OpenStreetMap, riquadro per riquadro (si può interrompere e riprendere)
  python tools/build_italy.py build   # calcola dislivelli, fondo, particolarità e scrive i file per l'app

Fonti: OpenStreetMap (Overpass API, ODbL) e Terrain Tiles (Mapzen, AWS Open Data).
"""
import concurrent.futures as cf
import json, math, os, re, subprocess, sys, time

import build_data as bd

CELL = 0.5
HOME = (40.85, 14.25)  # si parte dai riquadri più vicini a Napoli
RAW = os.path.join(bd.CACHE, "italy")
SERVERS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
           "https://overpass.private.coffee/api/interpreter"]
REL = 'relation["route"~"^(hiking|foot)$"]["network"!~"^(iwn|nwn)$"]'
bd.Z = 12


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def curl_overpass(q, dst, servers=SERVERS, tries=6):
    """Scarica una risposta Overpass in dst. Riprova su più server; rifiuta risposte incomplete."""
    tmp = dst + ".tmp"
    for t in range(tries):
        for u in servers:
            try:
                r = subprocess.run(["curl", "-s", "-m", "400", "-A", bd.UA["User-Agent"], "-o", tmp, "-w", "%{http_code}",
                                    "--data-urlencode", "data=" + q, u], capture_output=True, text=True)
                if r.stdout.strip() == "200":
                    with open(tmp, encoding="utf-8") as fh:
                        d = json.load(fh)
                    if "elements" in d and "remark" not in d:
                        os.replace(tmp, dst)
                        return True
                    log("   risposta incompleta da", u.split("/")[2], str(d.get("remark"))[:80])
                else:
                    log("   ", u.split("/")[2], "->", r.stdout.strip())
            except Exception as e:  # noqa
                log("   errore", u.split("/")[2], str(e)[:80])
            time.sleep(4)
        time.sleep(min(120, 15 * (t + 1)))
    return False


def cell_of(p):
    return (math.floor(p[0] / CELL) * CELL, math.floor(p[1] / CELL) * CELL)


def key(c):
    return f"{c[0]:.1f}_{c[1]:.1f}"


def load(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as fh:
        return json.load(fh)


# Maschera grossolana dell'Italia: per ogni fascia di mezzo grado di latitudine, gli intervalli di longitudine da coprire.
# (I riquadri di solo mare tornano vuoti in un attimo; vicino ai confini entra anche qualche sentiero dei paesi vicini.)
MASK = {47.0: [(10.0, 12.5)], 46.5: [(8.0, 8.5), (9.5, 13.5)], 46.0: [(7.5, 14.0)], 45.5: [(6.5, 14.0)], 45.0: [(6.5, 12.5)], 44.5: [(6.5, 12.5)],
        44.0: [(6.5, 12.5)], 43.5: [(7.5, 8.0), (9.5, 13.5)], 43.0: [(9.5, 14.0)], 42.5: [(10.0, 14.5)], 42.0: [(10.5, 16.5)], 41.5: [(12.0, 17.0)],
        41.0: [(8.0, 9.5), (12.5, 17.5)], 40.5: [(8.0, 10.0), (13.5, 18.5)], 40.0: [(8.0, 10.0), (14.5, 18.5)], 39.5: [(8.0, 10.0), (15.5, 18.5)],
        39.0: [(8.0, 10.0), (16.0, 17.5)], 38.5: [(8.0, 9.5), (14.0, 17.0)], 38.0: [(12.0, 16.5)], 37.5: [(12.0, 15.5)], 37.0: [(12.5, 15.5)],
        36.5: [(11.5, 12.5), (14.0, 15.5)]}


def cells_todo():
    """Riquadri da coprire, dal più vicino a Napoli al più lontano."""
    cs = []
    for lat, spans in MASK.items():
        for a, b in spans:
            lon = a
            while lon < b - 1e-9:
                cs.append((lat, round(lon, 1)))
                lon += CELL
    return sorted(cs, key=lambda c: bd.hav(HOME, (c[0] + CELL / 2, c[1] + CELL / 2))), {}


def fetch():
    os.makedirs(RAW, exist_ok=True)
    order, counts = cells_todo()
    log(len(order), "riquadri da scaricare")
    f = os.path.join(RAW, "towns.json")
    if not os.path.exists(f):
        log("Nomi dei paesi…")
        curl_overpass('[out:json][timeout:300];node["place"~"^(city|town|village)$"]["name"](35.4,6.5,47.2,18.6);out;', f)
    for n, c in enumerate(order):
        B = f"{c[0]},{c[1]},{c[0] + CELL},{c[1] + CELL}"
        ft = os.path.join(RAW, f"t_{key(c)}.json")
        if not os.path.exists(ft):
            log(f"[{n + 1}/{len(order)}] sentieri {key(c)}")
            q = f'[out:json][timeout:300][maxsize:1800000000];{REL}({B})->.r;.r out body geom;way(r.r);out tags;'
            if not curl_overpass(q, ft):
                log("   saltato per ora")
                continue
        ff = os.path.join(RAW, f"f_{key(c)}.json")
        if not os.path.exists(ff):
            log(f"[{n + 1}/{len(order)}] particolarità {key(c)}")
            q = (f'[out:json][timeout:300][maxsize:1800000000];(node["waterway"="waterfall"]({B});node["natural"~"^(peak|volcano|spring|cave_entrance)$"]({B});way["natural"="cave_entrance"]({B});'
                 f'node["tourism"="viewpoint"]({B});node["amenity"~"^(drinking_water|water_point)$"]({B});'
                 f'nw["historic"~"^(castle|ruins|archaeological_site|fort|monastery|tower|aqueduct|city_gate)$"]({B});nwr["natural"="water"]({B});nw["natural"="beach"]({B});'
                 f'nwr["natural"="wood"]({B});nwr["landuse"="forest"]({B}););out bb qt;way["waterway"="river"]({B});out geom qt;')
            if not curl_overpass(q, ff):
                log("   saltato per ora")
    log("Scaricamento finito")


# ---------- costruzione ----------
class Towns:
    def __init__(self):
        self.g = {}
        try:
            for e in load("towns.json")["elements"]:
                rank = {"city": 3, "town": 2, "village": 1}.get(e["tags"].get("place"), 0)
                self.g.setdefault((math.floor(e["lat"] / .1), math.floor(e["lon"] / .1)), []).append((e["lat"], e["lon"], e["tags"]["name"], rank))
        except Exception as e:  # noqa
            log("paesi non disponibili:", e)

    def near(self, p):
        gi, gj = math.floor(p[0] / .1), math.floor(p[1] / .1)
        best, bd_ = "", 1e9
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                for (la, lo, name, rank) in self.g.get((gi + a, gj + b), []):
                    d = bd.hav(p, (la, lo)) / (1 + rank * .6)  # a parità di distanza preferisco il centro più grande
                    if d < bd_:
                        best, bd_ = name, d
        return best


def feature_index(cells):
    G, BG = .005, .01
    pts, boxes = {}, {}

    def put_p(k, p, r):
        if p is not None:
            pts.setdefault((math.floor(p[0] / G), math.floor(p[1] / G)), []).append((k, p, r))

    def put_b(k, b, pad):
        dl, dn = pad / 111000, pad / 84000
        bb = [b["minlat"] - dl, b["minlon"] - dn, b["maxlat"] + dl, b["maxlon"] + dn]
        if (bb[2] - bb[0]) > .6 or (bb[3] - bb[1]) > .6:
            return  # riquadri enormi (parchi regionali segnati come bosco): troppo vaghi
        for i in range(math.floor(bb[0] / BG), math.floor(bb[2] / BG) + 1):
            for j in range(math.floor(bb[1] / BG), math.floor(bb[3] / BG) + 1):
                boxes.setdefault((i, j), []).append((k, bb))

    seen = set()
    for c in cells:
        f = os.path.join(RAW, f"f_{key(c)}.json")
        if not os.path.exists(f):
            continue
        for el in load(f"f_{key(c)}.json")["elements"]:
            eid = (el["type"], el["id"])
            if eid in seen:
                continue
            seen.add(eid)
            t = el.get("tags", {})
            b = el.get("bounds")
            p = [el["lat"], el["lon"]] if "lat" in el else ([(b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2] if b else None)
            if t.get("waterway") == "waterfall":
                put_p("cascate", p, 300)
            elif t.get("waterway") == "river" and el.get("geometry"):
                for qq in bd.thin([[g["lat"], g["lon"]] for g in el["geometry"]], 100):
                    put_p("fiumi", qq, 120)
            elif t.get("natural") in ("peak", "volcano"):
                put_p("vette", p, 150)
            elif t.get("natural") == "cave_entrance":
                put_p("grotte", p, 200)
            elif t.get("natural") == "spring":
                if t.get("drinking_water") == "yes":
                    put_p("fontanelle", p, 120)
            elif t.get("tourism") == "viewpoint":
                put_p("panorama", p, 150)
            elif t.get("amenity"):
                put_p("fontanelle", p, 120)
            elif t.get("historic"):
                put_p("storia", p, 150)
            elif t.get("natural") == "water" and b:
                diag = bd.hav([b["minlat"], b["minlon"]], [b["maxlat"], b["maxlon"]])
                w = t.get("water", "")
                if re.search("river|canal|stream", w):
                    put_b("fiumi", b, 80)
                elif not re.search("wastewater|basin|pond|reflecting_pool|fountain", w) and diag > 150:
                    put_b("laghi", b, 150)
            elif t.get("natural") == "beach" and b:
                put_b("spiaggia", b, 150)
            elif (t.get("natural") == "wood" or t.get("landuse") == "forest") and b:
                put_b("bosco", b, 0)
    return pts, boxes, G, BG


def features_for(path, ln, kind, idx):
    pts, boxes, G, BG = idx
    sm = bd.sample(path, min(250, max(10, round(ln / 80))))
    f, w, wood_n = [], [], 0
    for p in sm:
        gi, gj = math.floor(p[0] / G), math.floor(p[1] / G)
        for a in (-1, 0, 1):
            for bq in (-1, 0, 1):
                for (k, op, r) in pts.get((gi + a, gj + bq), []):
                    if bd.hav(p, op) <= r:
                        if k not in f:
                            f.append(k)
                        if k == "fontanelle" and op not in w:
                            w.append(op)
        in_wood = False
        for (k, bb) in boxes.get((math.floor(p[0] / BG), math.floor(p[1] / BG)), []):
            if bb[0] <= p[0] <= bb[2] and bb[1] <= p[1] <= bb[3]:
                if k == "bosco":
                    in_wood = True
                elif k not in f:
                    f.append(k)
        if in_wood:
            wood_n += 1
    wood = wood_n / len(sm)
    if wood >= .5 and "bosco" not in f:
        f.append("bosco")
    if kind == "foot" and "citta" not in f:
        f.append("citta")
    return {"f": f, "w": [[round(p[0], 5), round(p[1], 5)] for p in w[:12]], "wood": round(wood, 2)}


def need_tiles(path):
    n, out = 2 ** bd.Z, set()
    for p in bd.resample(path, 200):
        x = (p[1] + 180) / 360 * n
        lat = math.radians(p[0])
        y = (1 - math.log(math.tan(lat) + 1 / math.cos(lat)) / math.pi) / 2 * n
        for dx in (-.01, .01):
            for dy in (-.01, .01):
                out.add((int(x + dx), int(y + dy)))
    return out


def fetch_tile(k):
    d = os.path.join(bd.CACHE, "dem")
    f = os.path.join(d, f"{bd.Z}_{k[0]}_{k[1]}.png")
    if os.path.exists(f) and os.path.getsize(f) > 100:
        return
    url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{bd.Z}/{k[0]}/{k[1]}.png"
    for t in range(4):
        r = subprocess.run(["curl", "-s", "-m", "60", "-o", f + ".tmp", "-w", "%{http_code}", url], capture_output=True, text=True)
        if r.stdout.strip() == "200":
            os.replace(f + ".tmp", f)
            return
        time.sleep(1 + t)


def build(limit=None):
    order, counts = cells_todo()
    towns = Towns()
    os.makedirs(os.path.join(bd.CACHE, "dem"), exist_ok=True)
    out_dir = os.path.join(bd.ROOT, "data", "c")
    os.makedirs(out_dir, exist_ok=True)
    state_f = os.path.join(RAW, "built.json")
    built = json.load(open(state_f)) if os.path.exists(state_f) else {}   # riquadro grezzo -> fatto
    seen_f = os.path.join(RAW, "seen.json")
    seen = set(json.load(open(seen_f))) if os.path.exists(seen_f) else set()
    done = 0
    for c in order:
        k = key(c)
        ft = os.path.join(RAW, f"t_{k}.json")
        if k in built or not os.path.exists(ft) or not os.path.exists(os.path.join(RAW, f"f_{k}.json")):
            continue
        if limit and done >= limit:
            break
        log("Costruisco", k)
        data = load(f"t_{k}.json")
        wtags = {w["id"]: w.get("tags", {}) for w in data["elements"] if w["type"] == "way"}
        raw = []
        for el in data["elements"]:
            if el["type"] != "relation" or el["id"] in seen:
                continue
            t = el.get("tags", {})
            mem = [m for m in el.get("members", []) if m["type"] == "way" and m.get("geometry") and len(m["geometry"]) > 1]
            ways = [[[round(p["lat"], 5), round(p["lon"], 5)] for p in m["geometry"]] for m in mem]
            if not ways:
                continue
            ln = sum(bd.hav(w[i - 1], w[i]) for w in ways for i in range(1, len(w)))
            if ln < 500 or ln > 40000:
                continue
            name = t.get("name") or (t["from"] + " – " + t["to"] if t.get("from") and t.get("to") else ("Sentiero " + t["ref"] if t.get("ref") else ""))
            if not name:
                continue
            sf = "".join(bd.surface(wtags.get(m["ref"])) for m in mem)
            ways = [bd.thin(w, 25) for w in ways]
            cai = bool(re.search("cai", t.get("operator", "") + t.get("network", "") + t.get("osmc:symbol", ""), re.I)) or bool(t.get("cai_scale"))
            raw.append({"id": el["id"], "name": name[:90], "type": t.get("route"), "ref": t.get("ref", "")[:12], "from": t.get("from", "")[:40], "to": t.get("to", "")[:40],
                        "cai": cai, "scale": t.get("cai_scale", "").upper(), "dogs": t.get("dog", ""), "len": round(ln), "ways": ways, "sf": sf})
        paths = {tr["id"]: bd.chain(tr["ways"]) for tr in raw}
        tiles = set()
        for p in paths.values():
            tiles |= need_tiles(p)
        with cf.ThreadPoolExecutor(12) as ex:
            list(ex.map(fetch_tile, tiles))
        idx = feature_index([(c[0] + a * CELL, c[1] + b * CELL) for a in (-1, 0, 1) for b in (-1, 0, 1)])
        by_cell = {}
        for tr in raw:
            path = paths[tr["id"]]
            try:
                tr["e"] = bd.elevation(path)
            except Exception as e:  # noqa
                log("   quota non riuscita per", tr["id"], str(e)[:60])
                continue
            if len(tr["e"]["p"]) > 100:
                p = tr["e"]["p"]
                tr["e"]["p"] = [p[round(i * (len(p) - 1) / 99)] for i in range(100)]
            tr["f"] = features_for(path, tr["len"], tr["type"], idx)
            tr["zone"] = towns.near(path[len(path) // 2])
            seen.add(tr["id"])
            by_cell.setdefault(key(cell_of(path[0])), []).append(tr)
        if len(bd._tiles) > 300:
            bd._tiles.clear()
        for ck, lst in by_cell.items():
            dst = os.path.join(out_dir, ck + ".json")
            old = json.load(open(dst, encoding="utf-8"))["trails"] if os.path.exists(dst) else []
            ids = {t["id"] for t in lst}
            allt = [t for t in old if t["id"] not in ids] + lst
            json.dump({"trails": allt}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        built[k] = len(raw)
        json.dump(built, open(state_f, "w"))
        json.dump(sorted(seen), open(seen_f, "w"))
        done += 1
        log("   ", len(raw), "sentieri nuovi")
    # indice: quanti sentieri in ogni riquadro pubblicato
    index = {}
    tot = 0
    for fn in os.listdir(out_dir):
        if fn.endswith(".json"):
            n = len(json.load(open(os.path.join(out_dir, fn), encoding="utf-8"))["trails"])
            index[fn[:-5]] = n
            tot += n
    json.dump({"t": int(time.time() * 1000), "cell": CELL, "cells": index, "todo": len([c for c in order if key(c) not in built])},
              open(os.path.join(bd.ROOT, "data", "index.json"), "w"), separators=(",", ":"))
    log("Indice:", len(index), "riquadri,", tot, "sentieri; riquadri ancora da fare:", len([c for c in order if key(c) not in built]))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "fetch":
        fetch()
    elif cmd == "build":
        build(int(sys.argv[2]) if len(sys.argv) > 2 else None)
    else:
        print(__doc__)
