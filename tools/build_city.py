"""Luoghi utili per il cane e passeggiate in città, per tutta Italia.

Scrive data/p/<lat>_<lon>.json (aree cani, veterinari, spiagge per cani, parchi) e aggiunge ai file dei sentieri
(data/c/...) lungomare, lungolago e passeggiate pedonali con un nome.

Uso:  python tools/build_city.py      (dopo build_italy.py fetch; si può interrompere e riprendere)
Fonti: OpenStreetMap (Overpass API, ODbL) e Terrain Tiles (Mapzen, AWS Open Data).
"""
import concurrent.futures as cf
import json, os, re, time

import build_data as bd
import build_italy as bi

NAME = "^(Lungomare|Lungolago|Lungofiume|Lungarno|Lungotevere|Lungadige|Lungo Po|Lungo |Passeggiata|Pista ciclopedonale|Ciclopedonale|Promenade)"


def fetch(c):
    k = bi.key(c)
    dst = os.path.join(bi.RAW, f"c_{k}.json")
    if os.path.exists(dst):
        return True
    B = f"{c[0]},{c[1]},{c[0] + bi.CELL},{c[1] + bi.CELL}"
    q = (f'[out:json][timeout:200];(nwr["leisure"="dog_park"]({B});nwr["amenity"="veterinary"]({B});nwr["natural"="beach"]["dog"~"^(yes|leashed)$"]({B});'
         f'nwr["leisure"="beach_resort"]["dog"~"^(yes|leashed)$"]({B});way["leisure"="park"]["name"]({B});relation["leisure"="park"]["name"]({B}););out tags center bb;'
         f'way["highway"~"^(pedestrian|footway|path|cycleway)$"]["name"~"{NAME}"]["foot"!="no"]({B});out tags geom;')
    return bi.curl_overpass(q, dst, tries=3)


def build(c, towns):
    k = bi.key(c)
    data = bi.load(f"c_{k}.json")
    poi, parks, ways = [], [], {}
    for el in data["elements"]:
        t = el.get("tags", {})
        if el["type"] == "way" and el.get("geometry") and t.get("highway"):
            ways.setdefault(t["name"].strip(), []).append((el, [[round(p["lat"], 5), round(p["lon"], 5)] for p in el["geometry"]]))
            continue
        ce = el.get("center") or ({"lat": el["lat"], "lon": el["lon"]} if "lat" in el else None)
        if not ce:
            continue
        p = [round(ce["lat"], 5), round(ce["lon"], 5)]
        if bi.cell_of(p) != c:
            continue
        name = t.get("name", "")[:60]
        if t.get("leisure") == "dog_park":
            poi.append(["a", p[0], p[1], name])
        elif t.get("amenity") == "veterinary":
            tel = re.sub(r"[^+0-9]", "", (t.get("phone") or t.get("contact:phone") or "").split(";")[0])
            poi.append(["v", p[0], p[1], name, tel, "1" if t.get("emergency") == "yes" or "24/7" in t.get("opening_hours", "") else ""])
        elif t.get("dog"):
            poi.append(["s", p[0], p[1], name])
        elif t.get("leisure") == "park" and el.get("bounds"):
            b = el["bounds"]
            diag = bd.hav([b["minlat"], b["minlon"]], [b["maxlat"], b["maxlon"]])
            if diag >= 450:  # solo parchi abbastanza grandi per un giro
                parks.append({"id": el["id"], "n": name, "c": p, "d": round(diag), "dog": t.get("dog", "")})
    if poi or parks:
        os.makedirs(os.path.join(bd.ROOT, "data", "p"), exist_ok=True)
        json.dump({"poi": poi, "parks": sorted(parks, key=lambda x: -x["d"])[:60]}, open(os.path.join(bd.ROOT, "data", "p", k + ".json"), "w", encoding="utf-8"),
                  ensure_ascii=False, separators=(",", ":"))
    # passeggiate con un nome: unisco i pezzi con lo stesso nome
    walks = []
    for name, lst in ways.items():
        segs = [w for _, w in lst]
        ln = sum(bd.hav(w[i - 1], w[i]) for w in segs for i in range(1, len(w)))
        if ln < 600 or ln > 15000:
            continue
        path = bd.chain(segs)
        if bi.cell_of(path[0]) != c:
            continue
        # scarta gli insiemi di pezzi sparsi (stesso nome in paesi diversi)
        if sum(bd.hav(path[i - 1], path[i]) for i in range(1, len(path))) > ln * 1.6:
            continue
        sf = "".join(bd.surface(el.get("tags")) for el, _ in lst)
        walks.append({"id": -lst[0][0]["id"], "name": name[:90], "type": "foot", "kind": "city", "ref": "", "from": "", "to": "", "cai": False, "scale": "CITY",
                      "dogs": "", "len": round(ln), "ways": [bd.thin(w, 20) for w in segs], "sf": sf, "_p": path})
    if walks:
        tiles = set()
        for w in walks:
            tiles |= bi.need_tiles(w["_p"])
        with cf.ThreadPoolExecutor(12) as ex:
            list(ex.map(bi.fetch_tile, tiles))
        idx = bi.feature_index([c])
        out = []
        for w in walks:
            path = w.pop("_p")
            try:
                w["e"] = bd.elevation(path)
            except Exception:  # noqa
                continue
            w["e"]["p"] = w["e"]["p"][:100]
            w["f"] = bi.features_for(path, w["len"], "foot", idx)
            w["zone"] = towns.near(path[len(path) // 2])
            out.append(w)
        dst = os.path.join(bd.ROOT, "data", "c", k + ".json")
        old = json.load(open(dst, encoding="utf-8"))["trails"] if os.path.exists(dst) else []
        ids = {t["id"] for t in out}
        json.dump({"trails": [t for t in old if t["id"] not in ids] + out}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        if len(bd._tiles) > 300:
            bd._tiles.clear()
    return len(poi), len(parks), len(walks)


def main():
    order, _ = bi.cells_todo()
    towns = bi.Towns()
    state_f = os.path.join(bi.RAW, "city_built.json")
    built = json.load(open(state_f)) if os.path.exists(state_f) else {}
    tot = [0, 0, 0]
    for n, c in enumerate(order):
        k = bi.key(c)
        if k in built:
            continue
        if not fetch(c):
            bi.log("saltato", k)
            continue
        try:
            r = build(c, towns)
        except Exception as e:  # noqa
            bi.log("errore", k, str(e)[:100])
            continue
        built[k] = r
        json.dump(built, open(state_f, "w"))
        tot = [a + b for a, b in zip(tot, r)]
        bi.log(f"[{n + 1}/{len(order)}] {k}: {r[0]} luoghi, {r[1]} parchi, {r[2]} passeggiate")
    # indici: riquadri con luoghi + conteggio sentieri aggiornato
    pdir = os.path.join(bd.ROOT, "data", "p")
    cdir = os.path.join(bd.ROOT, "data", "c")
    idxf = os.path.join(bd.ROOT, "data", "index.json")
    idx = json.load(open(idxf))
    idx["places"] = sorted(fn[:-5] for fn in os.listdir(pdir) if fn.endswith(".json")) if os.path.isdir(pdir) else []
    idx["cells"] = {fn[:-5]: len(json.load(open(os.path.join(cdir, fn), encoding="utf-8"))["trails"]) for fn in os.listdir(cdir) if fn.endswith(".json")}
    idx["t"] = int(time.time() * 1000)
    json.dump(idx, open(idxf, "w"), separators=(",", ":"))
    bi.log("Finito:", tot)


if __name__ == "__main__":
    main()
