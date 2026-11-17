"""Giri in città: anelli da 2, 4 e 6 km che partono da parchi, ville comunali e lungomare.

Uso:
  python tools/build_walks.py fetch napoli   # scarica strade pedonali e aree verdi (Overpass)
  python tools/build_walks.py build napoli   # calcola gli anelli e li aggiunge a data/c/<riquadro>.json

Come sceglie la strada: ogni tratto ha un "costo" = lunghezza x fattore. Costano meno zone pedonali, sentieri e
vialetti nei parchi, di più le strade trafficate e le scale. Ogni anello passa da due punti scelti intorno alla
partenza (a forma di triangolo) e il programma prova 12 direzioni, tenendo quella con meno strada ripetuta,
più verde e meno traffico. Tutto si calcola qui una volta sola: nessuna chiave o servizio a pagamento.

Fonti: OpenStreetMap (Overpass API, ODbL) e Terrain Tiles (Mapzen, AWS Open Data) per il dislivello.
"""
import hashlib, heapq, json, math, os, sys, time

import build_data as bd
import build_italy as bi

CITIES = {
    "napoli": {
        "bbox": (40.775, 14.11, 40.925, 14.33),
        "zone": "Napoli",
        # punti di partenza: nome del posto e coordinate dell'ingresso o del centro
        "seeds": [
            ("Villa Comunale e lungomare Caracciolo", 40.8327, 14.2337),
            ("Lungomare di via Partenope e Castel dell'Ovo", 40.8318, 14.2493),
            ("Bosco di Capodimonte", 40.8697, 14.2519),
            ("Parco Virgiliano a Posillipo", 40.8004, 14.1885),
            ("Villa Floridiana al Vomero", 40.8406, 14.2307),
            ("Parco del Poggio", 40.8668, 14.2399),
            ("Bosco dei Camaldoli", 40.8586, 14.1998),
            ("Parco Mascagna e Vomero", 40.8445, 14.2283),
            ("Giardini del Molosiglio e Palazzo Reale", 40.8354, 14.2516),
        ],
    },
}
LENGTHS = (2000, 4000, 6000)
RAW = os.path.join(bd.CACHE, "walks")
ID0 = 9_000_000_000  # gli id dei giri in città partono da qui (non si confondono con quelli di OpenStreetMap)

FACT = {"pedestrian": .7, "footway": .75, "path": .75, "track": .9, "living_street": .8, "cycleway": 1.0, "steps": 5.0,
        "service": 1.15, "residential": 1.0, "unclassified": 1.25, "tertiary": 1.7, "tertiary_link": 1.7,
        "secondary": 2.4, "secondary_link": 2.4, "primary": 3.6, "primary_link": 3.6}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def fetch(city):
    c = CITIES[city] if isinstance(city, str) else city; city = c["key"] if not isinstance(city, str) else city
    os.makedirs(RAW, exist_ok=True)
    B = ",".join(str(x) for x in c["bbox"])
    f = os.path.join(RAW, f"{city}_roads.json")
    if not os.path.exists(f):
        log("Strade e sentieri…")
        q = (f'[out:json][timeout:300][maxsize:1500000000];way["highway"~"^({"|".join(FACT)})$"]["access"!~"^(private|no)$"]["foot"!~"^(no|private)$"]({B});out body geom;')
        bi.curl_overpass(q, f, servers=bi.SERVERS)
    g = os.path.join(RAW, f"{city}_green.json")
    if not os.path.exists(g):
        log("Parchi e aree verdi…")
        q = (f'[out:json][timeout:300];(way["leisure"~"^(park|garden|nature_reserve)$"]({B});relation["leisure"~"^(park|garden|nature_reserve)$"]({B});'
             f'way["landuse"~"^(forest|grass|recreation_ground|meadow)$"]({B});way["natural"~"^(wood|scrub)$"]({B});relation["natural"="wood"]({B});'
             f'way["natural"="beach"]({B});way["man_made"="pier"]({B}););out geom;')
        bi.curl_overpass(q, g, servers=bi.SERVERS)
    log("Fatto")


# ---------- aree verdi: test "punto dentro poligono" con una griglia ----------
class Green:
    def __init__(self, data):
        self.polys, self.grid, G = [], {}, .002
        self.G = G
        for el in data["elements"]:
            rings = []
            if el["type"] == "way" and el.get("geometry"):
                rings = [[(p["lat"], p["lon"]) for p in el["geometry"]]]
            elif el["type"] == "relation":
                rings = [[(p["lat"], p["lon"]) for p in m["geometry"]] for m in el.get("members", []) if m.get("role") == "outer" and m.get("geometry")]
            for r in rings:
                if len(r) < 3:
                    continue
                if (el.get("tags", {}).get("man_made") == "pier"):
                    continue
                la = [p[0] for p in r]; lo = [p[1] for p in r]
                bb = (min(la), min(lo), max(la), max(lo))
                if (bb[2] - bb[0]) * (bb[3] - bb[1]) > .01:
                    continue
                i = len(self.polys); self.polys.append((bb, r))
                for a in range(math.floor(bb[0] / G), math.floor(bb[2] / G) + 1):
                    for b in range(math.floor(bb[1] / G), math.floor(bb[3] / G) + 1):
                        self.grid.setdefault((a, b), []).append(i)

    def inside(self, p):
        for i in self.grid.get((math.floor(p[0] / self.G), math.floor(p[1] / self.G)), []):
            bb, r = self.polys[i]
            if not (bb[0] <= p[0] <= bb[2] and bb[1] <= p[1] <= bb[3]):
                continue
            c, j = False, len(r) - 1
            for k in range(len(r)):
                if (r[k][1] > p[1]) != (r[j][1] > p[1]) and p[0] < (r[j][0] - r[k][0]) * (p[1] - r[k][1]) / (r[j][1] - r[k][1]) + r[k][0]:
                    c = not c
                j = k
            if c:
                return True
        return False


# ---------- grafo ----------
def graph(city):
    roads = json.load(open(os.path.join(RAW, f"{city}_roads.json"), encoding="utf-8"))
    green = Green(json.load(open(os.path.join(RAW, f"{city}_green.json"), encoding="utf-8")))
    pos, adj, E = {}, {}, {}
    for w in roads["elements"]:
        t = w.get("tags", {})
        hw = t.get("highway")
        if hw not in FACT or not w.get("geometry") or t.get("area") == "yes":
            continue
        f = FACT[hw]
        if hw == "footway" and t.get("footway") in ("sidewalk", "crossing"):
            f = .95
        if hw in ("tertiary", "secondary", "primary") and t.get("sidewalk") in ("both", "separate"):
            f *= .8
        try:
            if int(str(t.get("maxspeed", "0")).split()[0]) > 50:
                f *= 1.5
        except ValueError:
            pass
        if t.get("tunnel") == "yes":
            f *= 2.5
        sc = bd.surface(t)
        for i in range(1, len(w["nodes"])):
            a, b = w["nodes"][i - 1], w["nodes"][i]
            pa = (w["geometry"][i - 1]["lat"], w["geometry"][i - 1]["lon"]); pb = (w["geometry"][i]["lat"], w["geometry"][i]["lon"])
            pos[a], pos[b] = pa, pb
            ln = bd.hav(pa, pb)
            if ln <= 0:
                continue
            mid = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
            gr = green.inside(mid) or t.get("man_made") == "pier"
            cost = ln * f * (.7 if gr else 1)
            key_ = (min(a, b), max(a, b))
            if key_ in E and E[key_]["c"] <= cost:
                continue
            E[key_] = {"l": ln, "c": cost, "g": gr, "hw": hw, "sf": sc, "bad": hw in ("secondary", "primary", "secondary_link", "primary_link") or (hw == "tertiary" and f > 1.5)}
            adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
    log("Grafo:", len(adj), "incroci,", len(E), "tratti")
    return pos, adj, E


def dijkstra(adj, E, src, dst, used, pen):
    dist, prev, h = {src: 0}, {}, [(0, src)]
    while h:
        d, u = heapq.heappop(h)
        if u == dst:
            break
        if d > dist.get(u, 1e18):
            continue
        for v in adj[u]:
            k = (min(u, v), max(u, v)); e = E[k]
            nd = d + e["c"] * (pen if k in used else 1)
            if nd < dist.get(v, 1e18):
                dist[v] = nd; prev[v] = u; heapq.heappush(h, (nd, v))
    if dst not in dist:
        return None
    path = [dst]
    while path[-1] != src:
        path.append(prev[path[-1]])
    return path[::-1]


def nearest(pos, adj, p, prefer=None):
    best, bd_ = None, 1e18
    for n in adj:
        q = pos[n]
        d = (q[0] - p[0]) ** 2 + ((q[1] - p[1]) * .76) ** 2
        if d < bd_:
            best, bd_ = n, d
    return best


def offset(p, dist, ang):
    return (p[0] + dist * math.cos(ang) / 111000, p[1] + dist * math.sin(ang) / (111000 * math.cos(math.radians(p[0]))))


def loop(pos, adj, E, s, L, ang, nodes_list, mul=1.0):
    """Anello s -> A -> B -> s; i punti A e B stanno a circa L/3,4 dalla partenza, a 60 gradi l'uno dall'altro."""
    d = L / 3.4 * mul
    A = nearest_fast(pos, nodes_list, offset(pos[s], d, ang))
    B = nearest_fast(pos, nodes_list, offset(pos[s], d, ang + math.pi / 3))
    used, nodes = set(), [s]
    for a, b in ((s, A), (A, B), (B, s)):
        if a == b:
            continue
        p = dijkstra(adj, E, a, b, used, 6)
        if not p:
            return None
        for i in range(1, len(p)):
            used.add((min(p[i - 1], p[i]), max(p[i - 1], p[i])))
        nodes += p[1:]
    return nodes


class NodeGrid:
    def __init__(self, pos, adj):
        self.g, self.G = {}, .003
        for n in adj:
            q = pos[n]
            self.g.setdefault((math.floor(q[0] / self.G), math.floor(q[1] / self.G)), []).append(n)


def nearest_fast(pos, ng, p):
    gi, gj = math.floor(p[0] / ng.G), math.floor(p[1] / ng.G)
    best, bd_ = None, 1e18
    for r in range(0, 6):
        for a in range(gi - r, gi + r + 1):
            for b in range(gj - r, gj + r + 1):
                if max(abs(a - gi), abs(b - gj)) != r:
                    continue
                for n in ng.g.get((a, b), []):
                    q = pos[n]
                    d = (q[0] - p[0]) ** 2 + ((q[1] - p[1]) * .76) ** 2
                    if d < bd_:
                        best, bd_ = n, d
        if best is not None and r >= 1:
            break
    return best


def judge(nodes, E, L):
    ln = rep = gr = bad = steps = 0
    seen = {}
    for i in range(1, len(nodes)):
        k = (min(nodes[i - 1], nodes[i]), max(nodes[i - 1], nodes[i])); e = E[k]
        ln += e["l"]
        if k in seen:
            rep += e["l"]
        seen[k] = 1
        if e["g"]:
            gr += e["l"]
        if e["bad"]:
            bad += e["l"]
        if e["hw"] == "steps":
            steps += e["l"]
    if ln < 300 or steps > 120:  # troppe scale: faticose per i cani grandi e anziani
        return None
    score = abs(ln - L) / L * 2 + rep / ln * 1.6 + bad / ln * 2.5 - gr / ln * 1.0 + steps / ln * 8
    return {"len": ln, "rep": rep / ln, "green": gr / ln, "bad": bad / ln, "steps": steps, "score": score}


def segments(nodes, pos, E):
    """Divide il giro in tratti con lo stesso tipo di fondo (per i colori 'Colora il fondo' dell'app)."""
    ways, sf, cur, cs = [], "", [pos[nodes[0]]], None
    for i in range(1, len(nodes)):
        e = E[(min(nodes[i - 1], nodes[i]), max(nodes[i - 1], nodes[i]))]
        s = "g" if e["hw"] == "steps" else e["sf"]
        if cs is not None and s != cs:
            ways.append(cur); sf += cs; cur = [cur[-1]]
        cs = s
        cur.append(pos[nodes[i]])
    ways.append(cur); sf += cs or "u"
    return [bd.thin([[round(p[0], 5), round(p[1], 5)] for p in w], 12) for w in ways], sf


def build(city, quick=False):
    c = CITIES[city] if isinstance(city, str) else city; city = c["key"] if not isinstance(city, str) else city
    pos, adj, E = graph(city)
    ng = NodeGrid(pos, adj)
    out = []
    for name, la, lo in c["seeds"]:
        s = nearest_fast(pos, ng, (la, lo))
        if s is None:
            log("  nessuna strada vicino a", name); continue
        prev_paths = []
        for L in LENGTHS:
            best = None
            # le strade di città girano molto: provo 12 direzioni e 4 distanze dei punti di passaggio
            for mul in ((1.0, .75, 1.25) if quick else (1.0, .8, .65, 1.25)):
                for k in range(8 if quick else 12):
                    nodes = loop(pos, adj, E, s, L, k * math.pi / (4 if quick else 6), ng, mul)
                    if not nodes:
                        continue
                    j = judge(nodes, E, L)
                    if not j or abs(j["len"] - L) / L > .3:
                        continue
                    if best is None or j["score"] < best[1]["score"]:
                        best = (nodes, j)
            if not best:
                log(f"  {name} {L} m: nessun anello buono"); continue
            nodes, j = best
            if c.get("tipo") == "natura" and (j["green"] < .3 or j["bad"] > .2):
                log(f"  {name} {L} m: troppa strada e poco verde, salto"); continue
            # salto i giri quasi uguali a uno più corto già preso
            st = set(nodes)
            if any(len(st & p) / len(st) > .75 for p in prev_paths):
                log(f"  {name} {L} m: troppo simile a un altro, salto"); continue
            prev_paths.append(st)
            ways, sf = segments(nodes, pos, E)
            km = j["len"] / 1000
            tid = ID0 + int(hashlib.md5(f"{city}|{name}|{L}".encode()).hexdigest()[:6], 16)
            out.append({"id": tid, "name": f"{name}: giro di {str(round(km, 1)).replace('.', ',')} km", "type": c.get("tipo", "walk"), "ref": "", "from": name[:40], "to": name[:40],
                        "cai": False, "scale": "", "dogs": "", "len": round(j["len"]), "ways": ways, "sf": sf, "loop": True,
                        "green": round(j["green"], 2), "busy": round(j["bad"], 2), "zone": c["zone"]})
            log(f"  {name}: {km:.1f} km, verde {j['green']:.0%}, strade trafficate {j['bad']:.0%}, ripetuto {j['rep']:.0%}, scale {j['steps']:.0f} m")
    # dislivello, particolarità, fontanelle
    idx_cells = set()
    for tr in out:
        idx_cells.add(bi.cell_of(tr["ways"][0][0]))
    near = {(a + x * bi.CELL, b + y * bi.CELL) for (a, b) in idx_cells for x in (-1, 0, 1) for y in (-1, 0, 1)}
    idx = bi.feature_index(sorted(near))
    tiles = set()
    for tr in out:
        tiles |= bi.need_tiles(bd.chain(tr["ways"]))
    import concurrent.futures as cf
    with cf.ThreadPoolExecutor(12) as ex:
        list(ex.map(bi.fetch_tile, tiles))
    by_cell = {}
    for tr in out:
        path = bd.chain(tr["ways"])
        try:
            tr["e"] = bd.elevation(path)
            if len(tr["e"]["p"]) > 100:
                p = tr["e"]["p"]; tr["e"]["p"] = [p[round(i * (len(p) - 1) / 99)] for i in range(100)]
        except Exception as e:  # noqa
            log("  quota non riuscita:", tr["name"], str(e)[:60])
        tr["f"] = bi.features_for(path, tr["len"], "foot", idx)
        if tr["green"] >= .45 and "bosco" not in tr["f"]["f"] and tr["f"]["wood"] < .3:
            pass
        by_cell.setdefault(bi.key(bi.cell_of(path[0])), []).append(tr)
    out_dir = os.path.join(bd.ROOT, "data", "c")
    for ck, lst in by_cell.items():
        dst = os.path.join(out_dir, ck + ".json")
        old = json.load(open(dst, encoding="utf-8"))["trails"] if os.path.exists(dst) else []
        if c.get("tipo") == "natura":
            nomi = {s_[0][:40] for s_ in c["seeds"]}
            old = [t for t in old if not (t.get("type") == "natura" and t.get("from") in nomi)]  # rifaccio solo i giri di questo posto
        else:
            old = [t for t in old if not (t.get("type") == "walk" and t.get("zone") == c["zone"])]  # rifaccio da capo i giri di questa città
        json.dump({"trails": old + lst}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    idxf = os.path.join(bd.ROOT, "data", "index.json")
    I = json.load(open(idxf))
    for ck in by_cell:
        I["cells"][ck] = len(json.load(open(os.path.join(out_dir, ck + ".json"), encoding="utf-8"))["trails"])
    I["t"] = int(time.time() * 1000)
    json.dump(I, open(idxf, "w"), separators=(",", ":"))
    log(len(out), "giri scritti in", ", ".join(by_cell))


# ---------- tutti i capoluoghi ----------
def capitals():
    """Capoluoghi di provincia e di regione (OpenStreetMap: place=city/town con capital=2, 4 o 6)."""
    f = os.path.join(RAW, "capoluoghi.json")
    if not os.path.exists(f):
        os.makedirs(RAW, exist_ok=True)
        bi.curl_overpass('[out:json][timeout:180];area["ISO3166-1"="IT"][admin_level=2]->.it;(node["place"~"^(city|town)$"]["capital"~"^(2|4|6)$"](area.it););out;', f)
    out = []
    for e in json.load(open(f, encoding="utf-8"))["elements"]:
        t = e["tags"]
        nm = t.get("name:it") or t["name"].split(" - ")[0].split("/")[-1].strip()
        out.append((nm, e["lat"], e["lon"]))
    if not any(o[0] == "Roma" for o in out):  # a Roma in OpenStreetMap manca il segno "capital"
        out.append(("Roma", 41.8933, 12.4829))
    return sorted(out)


def parks_near(lat, lon, r=3500):
    """Le ville comunali e i parchi più grandi vicino al centro, da data/p (creati da build_city.py)."""
    pdir = os.path.join(bd.ROOT, "data", "p")
    got = []
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            k = bi.key(bi.cell_of((lat + a * bi.CELL * .5, lon + b * bi.CELL * .5)))
            fn = os.path.join(pdir, k + ".json")
            if not os.path.exists(fn):
                continue
            for p in json.load(open(fn, encoding="utf-8"))["poi"]:
                if p[0] == "g" and p[3] and bd.hav((lat, lon), (p[1], p[2])) <= r and not p[3].lower().startswith(("piazza", "largo", "aiuola", "rotatoria")):
                    got.append(p)
    uniq = {}
    for p in got:
        uniq[(p[1], p[2])] = p
    return sorted(uniq.values(), key=lambda p: -(p[6] or 0))


def auto_city(nm, lat, lon):
    seeds = [(f"Centro di {nm}", lat, lon)]
    for p in parks_near(lat, lon):
        if len(seeds) >= 4:
            break
        if (p[6] or 0) < 180:
            break
        if all(bd.hav((p[1], p[2]), (s[1], s[2])) > 900 for s in seeds):
            seeds.append((p[3][:50], p[1], p[2]))
    key_ = "".join(ch for ch in nm.lower() if ch.isalnum())
    return {"key": key_, "zone": nm, "bbox": (round(lat - .045, 4), round(lon - .06, 4), round(lat + .045, 4), round(lon + .06, 4)), "seeds": seeds}


def all_cities(skip=("Napoli",), publish_every=15):
    import subprocess
    done_f = os.path.join(RAW, "done.json")
    done = set(json.load(open(done_f))) if os.path.exists(done_f) else set()
    todo = [c for c in capitals() if c[0] not in skip and c[0] not in done]
    log(len(todo), "capoluoghi da fare")
    n = 0
    for nm, la, lo in todo:
        c = auto_city(nm, la, lo)
        log(f"== {nm}: {len(c['seeds'])} partenze ({', '.join(s[0] for s in c['seeds'])})")
        try:
            fetch(c)
            build(c, quick=True)
        except Exception as e:  # noqa
            log("   non riuscito:", str(e)[:120])
            continue
        done.add(nm); json.dump(sorted(done), open(done_f, "w"))
        n += 1
        if n % publish_every == 0 or n == len(todo):
            publish(f"Giri in città: altri capoluoghi ({len(done)} fatti)")
    publish(f"Giri in città in tutti i capoluoghi ({len(done)})")
    log("FINE")


# ---------- posti nella natura senza sentieri segnati (riserve, cascate, boschi con un nome) ----------
NAT_RE = r"(cipresset|faggeta|abetin|pinet|leccet|castagnet|querce|bosco|foresta|selva|gola|gole|forra|cascat|lago|laghetto|oasi|riserva|parco)"


def natura_posti():
    """Posti con un nome, nella natura, dove non c'è nessun sentiero segnato entro 2 km."""
    import re
    f = os.path.join(RAW, "natura.json")
    if not os.path.exists(f):
        os.makedirs(RAW, exist_ok=True)
        q = ('[out:json][timeout:900];area["ISO3166-1"="IT"][admin_level=2]->.it;('
             'nwr["leisure"="nature_reserve"]["name"](area.it);'
             'node["natural"="waterfall"]["name"](area.it);'
             'nwr["natural"="wood"]["name"](area.it);nwr["landuse"="forest"]["name"](area.it);'
             'nwr["natural"="gorge"]["name"](area.it);nwr["natural"="valley"]["name"~"[Gg]ol|[Ff]orr"](area.it);'
             ');out tags center;')
        bi.curl_overpass(q, f, servers=bi.SERVERS)
    els = json.load(open(f, encoding="utf-8"))["elements"]
    # partenze dei sentieri che ci sono già
    starts = {}
    for r in json.load(open(os.path.join(bd.ROOT, "data", "names.json"), encoding="utf-8"))["r"]:
        starts.setdefault((round(r[5] * 20), round(r[6] * 20)), []).append((r[5], r[6]))
    def vicino(la, lo, m=2000):
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                for p in starts.get((round(la * 20) + a, round(lo * 20) + b), []):
                    if bd.hav((la, lo), p) < m:
                        return True
        return False
    out, visti = [], []
    for e in els:
        t = e.get("tags", {})
        nm = (t.get("name:it") or t.get("name") or "").strip()
        la, lo = (e["lat"], e["lon"]) if "lat" in e else ((e.get("center") or {}).get("lat"), (e.get("center") or {}).get("lon"))
        if not nm or la is None or len(nm) > 60:
            continue
        if not (t.get("natural") == "waterfall" or t.get("leisure") == "nature_reserve" or re.search(NAT_RE, nm, re.I)):
            continue
        if vicino(la, lo) or any(bd.hav((la, lo), v) < 1500 for v in visti[-400:]):
            continue
        visti.append((la, lo))
        peso = 0 if t.get("natural") == "waterfall" else 1 if t.get("leisure") == "nature_reserve" else 2
        out.append((peso, nm[0].upper() + nm[1:], la, lo, e["type"][0] + str(e["id"])))
    out.sort()
    return out


def natura(publish_every=20, limite=None):
    done_f = os.path.join(RAW, "natura-fatti.json")
    done = set(json.load(open(done_f))) if os.path.exists(done_f) else set()
    todo = [p for p in natura_posti() if p[4] not in done]
    if limite:
        todo = todo[:int(limite)]
    log(len(todo), "posti nella natura da fare")
    n = 0
    for _, nm, la, lo, oid in todo:
        c = {"key": "n" + oid, "zone": nm, "tipo": "natura", "bbox": (round(la - .03, 4), round(lo - .04, 4), round(la + .03, 4), round(lo + .04, 4)), "seeds": [(nm, la, lo)]}
        log(f"== {nm} ({oid})")
        try:
            fetch(c)
            build(c, quick=True)
        except Exception as e:  # noqa
            log("   non riuscito:", str(e)[:120])
        done.add(oid); json.dump(sorted(done), open(done_f, "w"))
        for fx in ("_roads.json", "_green.json"):  # i dati grezzi di ogni posto non servono più
            try: os.remove(os.path.join(RAW, c["key"] + fx))
            except OSError: pass
        n += 1
        if n % publish_every == 0 or n == len(todo):
            publish(f"Sentieri nella natura: giri ad anello vicino a riserve, cascate e boschi senza sentieri segnati ({len(done)} posti)")
    log("FINE")


def publish(msg):
    import subprocess
    run = lambda *a: subprocess.run(["git", "-C", bd.ROOT] + list(a), capture_output=True, text=True)
    subprocess.run([sys.executable, os.path.join(bd.ROOT, "tools", "build_names.py")], capture_output=True)  # la ricerca deve trovare i giri nuovi
    run("add", "data/c", "data/index.json", "data/names.json")
    if run("diff", "--cached", "--quiet").returncode == 0:
        return
    run("commit", "-q", "-m", msg + "\n\nCo-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>")
    for t in range(4):
        r1 = run("pull", "-q", "--rebase")
        r2 = run("push", "-q", "origin", "main")
        if r2.returncode == 0:
            log("pubblicato"); return
        log("push non riuscito, riprovo:", (r1.stderr + r2.stderr)[:120]); time.sleep(10 * (t + 1))


if __name__ == "__main__":
    if sys.argv[1:2] == ["tutti"]:
        all_cities(); sys.exit()
    if sys.argv[1:2] == ["natura"]:
        natura(limite=(sys.argv[2:3] or [None])[0]); sys.exit()
    cmd, city = (sys.argv[1:3] + ["", ""])[:2]
    if cmd == "fetch" and city in CITIES:
        fetch(city)
    elif cmd == "build" and city in CITIES:
        build(city)
    else:
        print(__doc__)
