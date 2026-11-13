"""Prepara data/trails.json: sentieri, dislivelli e particolarità già calcolati,
così l'app non deve scaricarli e calcolarli ogni volta sul telefono.

Uso:  python tools/build_data.py
Fonti: OpenStreetMap (Overpass API, ODbL) e Terrain Tiles (Mapzen, AWS Open Data).
"""
import json, math, os, re, subprocess, time, urllib.request
from PIL import Image

AREA = dict(s=40.52, w=13.85, n=41.02, e=14.85)
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.private.coffee/api/interpreter"]
ZONES = [["Ischia", 40.69, 13.85, 40.77, 13.97], ["Procida", 40.74, 13.99, 40.77, 14.04], ["Capri", 40.53, 14.19, 40.57, 14.27],
         ["Campi Flegrei", 40.78, 14.02, 40.90, 14.18], ["Napoli", 40.80, 14.18, 40.90, 14.30], ["Vesuvio", 40.77, 14.35, 40.87, 14.50],
         ["Penisola Sorrentina", 40.56, 14.30, 40.66, 14.46], ["Monti Lattari e Costiera", 40.60, 14.46, 40.74, 14.72],
         ["Partenio e Monti di Sarno", 40.80, 14.50, 41.02, 14.85]]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.environ.get("ALLDOGS_CACHE", os.path.join(ROOT, ".cache"))
UA = {"User-Agent": "trail-data-builder/1.0"}


def hav(a, b):
    R, r = 6371000, math.pi / 180
    dl, dn = (b[0] - a[0]) * r, (b[1] - a[1]) * r
    x = math.sin(dl / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin(dn / 2) ** 2
    return 2 * R * math.asin(math.sqrt(x))


def thin(w, mn):
    o = [w[0]]
    for i in range(1, len(w) - 1):
        if hav(o[-1], w[i]) >= mn:
            o.append(w[i])
    if len(w) > 1:
        o.append(w[-1])
    return o


def chain(ways):
    rest = [w for w in ways[1:]]
    path = list(ways[0])
    while rest:
        end = path[-1]
        bi, bd, rev = 0, float("inf"), False
        for i, w in enumerate(rest):
            a, b = hav(end, w[0]), hav(end, w[-1])
            if a < bd:
                bd, bi, rev = a, i, False
            if b < bd:
                bd, bi, rev = b, i, True
        w = rest.pop(bi)
        path += list(reversed(w)) if rev else w
    return path


def resample(path, step):
    """Punti ogni `step` metri lungo il percorso (interpolati)."""
    out = [path[0]]
    carry = 0.0
    for i in range(1, len(path)):
        a, b = path[i - 1], path[i]
        d = hav(a, b)
        if d <= 0:
            continue
        pos = step - carry
        while pos <= d:
            f = pos / d
            out.append([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
            pos += step
        carry = (carry + d) % step
    out.append(path[-1])
    return out


def sample(path, n):
    if len(path) < 2:
        return list(path)
    cum = [0]
    for i in range(1, len(path)):
        cum.append(cum[-1] + hav(path[i - 1], path[i]))
    tot, out, j = cum[-1], [], 0
    for k in range(n):
        d = tot * k / (n - 1)
        while j < len(cum) - 2 and cum[j + 1] < d:
            j += 1
        out.append(path[j])
    return out


def zone_of(p):
    for z in ZONES:
        if z[1] <= p[0] <= z[3] and z[2] <= p[1] <= z[4]:
            return z[0]
    return "Campania"


def overpass(q, name):
    os.makedirs(CACHE, exist_ok=True)
    f = os.path.join(CACHE, name + ".json")
    if os.path.exists(f) and time.time() - os.path.getmtime(f) < 86400:
        return json.load(open(f, encoding="utf-8"))
    err = None
    for u in OVERPASS:
        for tries in range(2):
            try:
                print("  Overpass:", u, flush=True)
                # curl: su alcuni PC Python non riesce a verificare il certificato del server
                tmp = f + ".tmp"
                subprocess.run(["curl", "-s", "-m", "280", "-A", UA["User-Agent"], "-o", tmp, "--data-urlencode", "data=" + q, u], check=True)
                data = json.load(open(tmp, encoding="utf-8"))
                os.replace(tmp, f)
                return data
            except Exception as e:  # noqa
                err = e
                print("   errore:", e, flush=True)
                time.sleep(5 * (tries + 1))
    raise err


# ---------- quote dai Terrain Tiles (terrarium) ----------
Z = 13
_tiles = {}


def tile(x, y):
    k = (x, y)
    if k in _tiles:
        return _tiles[k]
    d = os.path.join(CACHE, "dem")
    os.makedirs(d, exist_ok=True)
    f = os.path.join(d, f"{Z}_{x}_{y}.png")
    if not os.path.exists(f):
        url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{x}/{y}.png"
        for t in range(4):
            try:
                b = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
                open(f, "wb").write(b)
                break
            except Exception as e:  # noqa
                if t == 3:
                    raise
                time.sleep(2 * (t + 1))
    im = Image.open(f).convert("RGB")
    _tiles[k] = im.load()
    return _tiles[k]


def height(p):
    n = 2 ** Z
    x = (p[1] + 180) / 360 * n
    lat = math.radians(p[0])
    y = (1 - math.log(math.tan(lat) + 1 / math.cos(lat)) / math.pi) / 2 * n
    # interpolazione tra i 4 pixel vicini: profilo piu' morbido e fedele
    gx, gy = x * 256 - .5, y * 256 - .5
    x0, y0 = math.floor(gx), math.floor(gy)
    fx, fy = gx - x0, gy - y0

    def px(ix, iy):
        r, g, b = tile(ix // 256, iy // 256)[ix % 256, iy % 256]
        return r * 256 + g + b / 256 - 32768
    return (px(x0, y0) * (1 - fx) + px(x0 + 1, y0) * fx) * (1 - fy) + (px(x0, y0 + 1) * (1 - fx) + px(x0 + 1, y0 + 1) * fx) * fy


def elevation(path):
    pts = resample(path, 25)
    z = [height(p) for p in pts]
    # media mobile per togliere il rumore, poi somma solo i dislivelli sopra una soglia
    sm = [sum(z[max(0, i - 2):i + 3]) / len(z[max(0, i - 2):i + 3]) for i in range(len(z))]
    up = down = 0.0
    ref = sm[0]
    TH = 3
    for v in sm[1:]:
        if v - ref >= TH:
            up += v - ref
            ref = v
        elif ref - v >= TH:
            down += ref - v
            ref = v
    # profilo per il grafico: quote a distanze uguali lungo il percorso
    n = max(20, min(140, round(len(pts) / 2)))
    prof = [round(sm[min(len(sm) - 1, round(i * (len(sm) - 1) / (n - 1)))]) for i in range(n)]
    return {"up": round(max(up, down)), "max": round(max(z)), "min": round(min(z)), "p": prof}


HARD = {"asphalt", "concrete", "concrete:plates", "concrete:lanes", "paved", "paving_stones", "sett", "cobblestone", "unhewn_cobblestone", "metal", "bricks", "brick"}
SOFT = {"unpaved", "ground", "dirt", "earth", "grass", "gravel", "fine_gravel", "compacted", "sand", "rock", "pebblestone", "mud", "woodchips", "wood", "grass_paver", "soil", "stone"}
ROADS = {"residential", "tertiary", "secondary", "primary", "unclassified", "service", "living_street", "trunk", "tertiary_link", "secondary_link", "primary_link"}


def surface(t):
    """a = asfalto o pietra, n = terra o erba, g = gradini, u = non indicato"""
    if not t:
        return "u"
    if t.get("highway") == "steps":
        return "g"
    s = t.get("surface", "")
    if s in HARD:
        return "a"
    if s in SOFT:
        return "n"
    if t.get("highway") in ROADS:
        return "a"
    return "u"


def main():
    B = f"{AREA['s']},{AREA['w']},{AREA['n']},{AREA['e']}"
    print("Scarico i sentieri…", flush=True)
    data = overpass(f'[out:json][timeout:180];relation["route"~"^(hiking|foot)$"]["network"!~"^(iwn|nwn)$"]({B});out body geom;', "trails")
    print("Scarico il tipo di fondo…", flush=True)
    wt = overpass(f'[out:json][timeout:180];relation["route"~"^(hiking|foot)$"]["network"!~"^(iwn|nwn)$"]({B});way(r);out tags;', "waytags")
    wtags = {w["id"]: w.get("tags", {}) for w in wt["elements"] if w["type"] == "way"}
    trails = []
    for el in data["elements"]:
        t = el.get("tags", {})
        mem = [m for m in el.get("members", []) if m["type"] == "way" and m.get("geometry") and len(m["geometry"]) > 1]
        ways = [[[round(p["lat"], 5), round(p["lon"], 5)] for p in m["geometry"]] for m in mem]
        sf = "".join(surface(wtags.get(m["ref"])) for m in mem)
        if not ways:
            continue
        ln = sum(hav(w[i - 1], w[i]) for w in ways for i in range(1, len(w)))
        if ln < 500 or ln > 40000:
            continue
        ways = [thin(w, 25) for w in ways]
        cai = bool(re.search("cai", t.get("operator", "") + t.get("network", "") + t.get("osmc:symbol", ""), re.I)) or bool(t.get("cai_scale"))
        name = t.get("name") or (t["from"] + " – " + t["to"] if t.get("from") and t.get("to") else ("Sentiero " + t["ref"] if t.get("ref") else ""))
        if not name:
            continue
        trails.append({"id": el["id"], "name": name, "type": t.get("route"), "ref": t.get("ref", ""), "from": t.get("from", ""), "to": t.get("to", ""),
                       "cai": cai, "scale": t.get("cai_scale", "").upper(), "operator": t.get("operator", ""), "dogs": t.get("dog", ""),
                       "len": round(ln), "ways": ways, "sf": sf})
    print(len(trails), "sentieri", flush=True)

    print("Calcolo i dislivelli…", flush=True)
    elev, paths = {}, {}
    for i, tr in enumerate(trails):
        paths[tr["id"]] = chain(tr["ways"])
        elev[str(tr["id"])] = elevation(paths[tr["id"]])
        if i % 50 == 0:
            print(" ", i, "/", len(trails), flush=True)

    print("Scarico le particolarità…", flush=True)
    q = (f'[out:json][timeout:180];(node["waterway"="waterfall"]({B});node["natural"~"^(peak|volcano|spring|cave_entrance)$"]({B});way["natural"="cave_entrance"]({B});'
         f'node["tourism"="viewpoint"]({B});node["amenity"~"^(drinking_water|water_point)$"]({B});'
         f'nw["historic"~"^(castle|ruins|archaeological_site|fort|monastery|tower|aqueduct|city_gate)$"]({B});nwr["natural"="water"]({B});nw["natural"="beach"]({B});'
         f'nwr["natural"="wood"]({B});nwr["landuse"="forest"]({B}););out bb qt;way["waterway"="river"]({B});out geom qt;')
    fd = overpass(q, "features")
    G, BG = .005, .01
    pts, boxes = {}, {}

    def put_p(k, p, r):
        if p is None:
            return
        pts.setdefault((math.floor(p[0] / G), math.floor(p[1] / G)), []).append((k, p, r))

    def put_b(k, b, pad):
        dl, dn = pad / 111000, pad / 84000
        bb = [b["minlat"] - dl, b["minlon"] - dn, b["maxlat"] + dl, b["maxlon"] + dn]
        for i in range(math.floor(bb[0] / BG), math.floor(bb[2] / BG) + 1):
            for j in range(math.floor(bb[1] / BG), math.floor(bb[3] / BG) + 1):
                boxes.setdefault((i, j), []).append((k, bb))

    for el in fd["elements"]:
        t = el.get("tags", {})
        b = el.get("bounds")
        p = [el["lat"], el["lon"]] if "lat" in el else ([(b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2] if b else None)
        if t.get("waterway") == "waterfall":
            put_p("cascate", p, 300)
        elif t.get("waterway") == "river" and el.get("geometry"):
            for qq in thin([[g["lat"], g["lon"]] for g in el["geometry"]], 100):
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
            diag = hav([b["minlat"], b["minlon"]], [b["maxlat"], b["maxlon"]])
            w = t.get("water", "")
            if re.search("river|canal|stream", w):
                put_b("fiumi", b, 80)
            elif not re.search("wastewater|basin|pond|reflecting_pool|fountain", w) and diag > 150:
                put_b("laghi", b, 150)
        elif t.get("natural") == "beach" and b:
            put_b("spiaggia", b, 150)
        elif (t.get("natural") == "wood" or t.get("landuse") == "forest") and b:
            put_b("bosco", b, 0)

    feat = {}
    for tr in trails:
        path = paths[tr["id"]]
        sm = sample(path, min(250, max(10, round(tr["len"] / 80))))
        f, w, wood_n = [], [], 0
        for p in sm:
            gi, gj = math.floor(p[0] / G), math.floor(p[1] / G)
            for a in (-1, 0, 1):
                for bq in (-1, 0, 1):
                    for (k, op, r) in pts.get((gi + a, gj + bq), []):
                        if hav(p, op) <= r:
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
        zone = zone_of(path[len(path) // 2])
        if (tr["type"] == "foot" or zone == "Napoli") and "citta" not in f:
            f.append("citta")
        feat[str(tr["id"])] = {"f": f, "w": [[round(p[0], 5), round(p[1], 5)] for p in w], "wood": round(wood, 2)}

    out = {"t": int(time.time() * 1000), "trails": trails, "elev": elev, "feat": feat}
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    dst = os.path.join(ROOT, "data", "trails.json")
    json.dump(out, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("Scritto", dst, round(os.path.getsize(dst) / 1024), "KB", flush=True)


if __name__ == "__main__":
    main()
