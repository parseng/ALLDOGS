"""Particolarità e descrizione di ogni sentiero, ricalcolate con la forma vera di fiumi, torrenti, laghi e spiagge.

Uso:
  python tools/build_feats.py fetch          # scarica (una volta) fiumi/torrenti con nome, laghi e spiagge con la loro forma, riquadro per riquadro
  python tools/build_feats.py apply [cella]  # riscrive "f" (particolarità, nomi) e "d" (descrizione) dei sentieri in data/c/
  python tools/build_feats.py check <id>     # mostra cosa trova per un sentiero

Regole (pensate per rispondere a "questo sentiero ha un fiume?" come lo intende chi cerca):
  fiumi     il sentiero corre accanto a un fiume o torrente con nome (entro 70 m) per almeno 400 m o per il 20% della lunghezza
  laghi     il sentiero arriva a 120 m dalla riva di un lago o invaso vero (non vasche, stagni o depuratori)
  spiaggia  il sentiero arriva a 80 m da una spiaggia
  cascate   una cascata segnata entro 200 m dal tracciato
  vette     una cima entro 120 m; panorama, siti storici entro 100 m; grotte entro 150 m; fontanelle entro 100 m
  bosco     almeno metà del percorso dentro boschi (come prima)
"""
import json, math, os, re, sys, time

import build_data as bd
import build_italy as bi

RAW = bi.RAW
G = .005  # griglia ~500 m per cercare in fretta


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


# ---------- scaricamento ----------
def fetch(only=None):
    order, _ = bi.cells_todo()
    if only:
        order = [c for c in order if bi.key(c) in only]
    for n, c in enumerate(order):
        k = bi.key(c)
        B = f"{c[0]},{c[1]},{c[0] + bi.CELL},{c[1] + bi.CELL}"
        rdst = os.path.join(RAW, f"r_{k}.json")
        if not os.path.exists(rdst):
            # laghi e spiagge grandi sono "relazioni": servono i loro pezzi (body), tagliati sul riquadro
            log(f"[{n + 1}/{len(order)}] laghi grandi {k}")
            q = (f'[out:json][timeout:400];(relation["natural"="water"]["water"!~"^(pond|basin|wastewater|reflecting_pool|fountain|canal|ditch|moat)$"]({B});'
                 f'relation["natural"="beach"]({B}););out body geom({c[0] - .02},{c[1] - .02},{c[0] + bi.CELL + .02},{c[1] + bi.CELL + .02}) qt;')
            if not bi.curl_overpass(q, rdst):
                log("   saltato per ora")
        dst = os.path.join(RAW, f"g_{k}.json")
        if os.path.exists(dst):
            continue
        log(f"[{n + 1}/{len(order)}] acque e spiagge {k}")
        q = (f'[out:json][timeout:400];('
             f'way["waterway"~"^(river|stream)$"]["name"]({B});'
             f'way["natural"="water"]["water"!~"^(pond|basin|wastewater|reflecting_pool|fountain|canal|ditch|moat|reservoir_covered|swimming_pool)$"]({B});'
             f'relation["natural"="water"]["water"!~"^(pond|basin|wastewater|reflecting_pool|fountain|canal|ditch|moat)$"]({B});'
             f'nwr["natural"="beach"]({B}););'
             f'out tags geom({c[0] - .02},{c[1] - .02},{c[0] + bi.CELL + .02},{c[1] + bi.CELL + .02}) qt;')
        if not bi.curl_overpass(q, dst):
            log("   saltato per ora")
    log("Scaricamento finito")


# ---------- geometria ----------
KY = 111320.0


def local(p, lat0):
    return (p[1] * KY * math.cos(math.radians(lat0)), p[0] * KY)


def seg_dist(p, a, b, lat0):
    px, py = local(p, lat0)
    ax, ay = local(a, lat0)
    bx, by = local(b, lat0)
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0 if L == 0 else max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)


class Lines:
    """Segmenti (fiumi, rive) in una griglia, ciascuno col suo nome."""

    def __init__(self):
        self.g = {}

    def add(self, pts, label):
        for i in range(1, len(pts)):
            a, b = pts[i - 1], pts[i]
            for gi in range(math.floor(min(a[0], b[0]) / G), math.floor(max(a[0], b[0]) / G) + 1):
                for gj in range(math.floor(min(a[1], b[1]) / G), math.floor(max(a[1], b[1]) / G) + 1):
                    self.g.setdefault((gi, gj), []).append((a, b, label))

    def near(self, p, r):
        """(distanza minima, nome) entro r metri, oppure None."""
        gi, gj = math.floor(p[0] / G), math.floor(p[1] / G)
        best = None
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                for (s, e, label) in self.g.get((gi + a, gj + b), []):
                    d = seg_dist(p, s, e, p[0])
                    if d <= r and (best is None or d < best[0]):
                        best = (d, label)
        return best


def nice_name(t):
    n = (t.get("name:it") or t.get("name") or "").strip()
    return n[:60]


def water_index(cells):
    rivers, lakes, beaches = Lines(), Lines(), Lines()
    def pieces(geom):
        out, cur = [], []
        for g in geom or []:
            if g:
                cur.append([g["lat"], g["lon"]])
            else:
                if len(cur) > 1:
                    out.append(cur)
                cur = []
        if len(cur) > 1:
            out.append(cur)
        return out

    # i pezzi sono tagliati sul riquadro: raccolgo tutti i pezzi di ogni elemento da tutti i riquadri
    allel = {}
    for c in cells:
        for pre in ("g", "r"):
            f = os.path.join(RAW, f"{pre}_{bi.key(c)}.json")
            if not os.path.exists(f):
                continue
            for el in json.load(open(f, encoding="utf-8"))["elements"]:
                if (pre == "r") != (el["type"] == "relation"):
                    continue
                eid = (el["type"], el["id"])
                tg, ls, done = allel.setdefault(eid, (el.get("tags", {}), [], set()))
                if el["type"] == "way":
                    segs = pieces(el.get("geometry"))
                else:
                    segs = [x for m in el.get("members", []) for x in pieces(m.get("geometry"))]
                for l in segs:
                    k = (tuple(l[0]), tuple(l[-1]), len(l))
                    if k not in done:
                        done.add(k)
                        ls.append(l)
    for eid, (t, lines, _) in allel.items():
        if True:
            if not lines:
                continue
            name = nice_name(t)
            if t.get("waterway") in ("river", "stream"):
                kind = "f" if t["waterway"] == "river" else "t"
                for l in lines:
                    rivers.add(l, (kind, name))
            elif t.get("natural") == "water":
                w = t.get("water", "")
                if re.search("river|stream|canal", w):
                    for l in lines:
                        rivers.add(l, ("f", name))
                    continue
                # piccoli specchi d'acqua senza nome non sono "laghi"
                per = sum(bd.hav(l[i - 1], l[i]) for l in lines for i in range(1, len(l)))
                if per < (300 if name else 600):
                    continue
                kind = "v" if w == "reservoir" or re.search(r"\b(invaso|diga|serbatoio)\b", name, re.I) else "l"
                if w == "lagoon":
                    kind = "g"
                for l in lines:
                    lakes.add(l, (kind, name))
            elif t.get("natural") == "beach":
                for l in lines:
                    beaches.add(l, ("s", name))
    return rivers, lakes, beaches


def point_index(cells):
    """Punti notevoli dai file già scaricati (f_*.json), con il loro nome."""
    pts = {}
    seen = set()
    for c in cells:
        f = os.path.join(RAW, f"f_{bi.key(c)}.json")
        if not os.path.exists(f):
            continue
        for el in json.load(open(f, encoding="utf-8"))["elements"]:
            eid = (el["type"], el["id"])
            if eid in seen:
                continue
            seen.add(eid)
            t = el.get("tags", {})
            b = el.get("bounds")
            p = [el["lat"], el["lon"]] if "lat" in el else ([(b["minlat"] + b["maxlat"]) / 2, (b["minlon"] + b["maxlon"]) / 2] if b else None)
            if p is None:
                continue
            k = r = None
            if t.get("waterway") == "waterfall":
                k, r = "cascate", 200
            elif t.get("natural") in ("peak", "volcano"):
                k, r = "vette", 120
            elif t.get("natural") == "cave_entrance":
                k, r = "grotte", 150
            elif t.get("natural") == "spring":
                if t.get("drinking_water") == "yes":
                    k, r = "fontanelle", 100
            elif t.get("tourism") == "viewpoint":
                k, r = "panorama", 100
            elif t.get("amenity") in ("drinking_water", "water_point"):
                if t.get("drinking_water") != "no" and t.get("access") not in ("private", "no"):
                    k, r = "fontanelle", 100
            elif t.get("historic"):
                if b and bd.hav([b["minlat"], b["minlon"]], [b["maxlat"], b["maxlon"]]) > 3000:
                    continue  # centri storici o mura enormi: troppo vaghi
                k, r = "storia", 100
            if not k:
                continue
            ele = t.get("ele", "")
            try:
                ele = round(float(str(ele).replace(",", ".").split(";")[0].replace("m", "").strip()))
            except Exception:  # noqa
                ele = None
            extra = {"ele": ele, "h": t.get("historic", "")}
            pts.setdefault((math.floor(p[0] / G), math.floor(p[1] / G)), []).append((k, p, r, nice_name(t), extra))
    return pts


def wood_index(cells):
    """Boschi come prima (riquadro del bosco), riusando build_italy."""
    _, boxes, _, BG = bi.feature_index(cells)
    return boxes, BG


class Index:
    def __init__(self, cells):
        self.cells = set(cells)
        self.rivers, self.lakes, self.beaches = water_index(cells)
        self.pts = point_index(cells)
        self.boxes, self.BG = wood_index(cells)


_idx = {"key": None, "v": None}


def index_for(c):
    near = tuple(sorted((c[0] + a * bi.CELL, c[1] + b * bi.CELL) for a in (-1, 0, 1) for b in (-1, 0, 1)))
    if _idx["key"] != near:
        _idx["v"] = Index(near)
        _idx["key"] = near
    return _idx["v"]


def features(path, ln, kind, I, text=""):
    step = 40
    sm = bd.resample(path, step) if ln > 0 else path
    if len(sm) < 2:
        sm = path
    f, w, names = [], [], {}
    seg = ln / max(1, len(sm))

    def add(k, nm=None):
        if k not in f:
            f.append(k)
        if nm:
            lst = names.setdefault(k, [])
            if nm not in lst and len(lst) < 3:
                lst.append(nm)

    # fiumi e torrenti: quanta strada si fa lungo l'acqua
    along, rnames, rkinds = 0.0, {}, {}
    for p in sm:
        h = I.rivers.near(p, 70)
        if h:
            along += seg
            if h[1][1]:
                rnames[h[1][1]] = rnames.get(h[1][1], 0) + 1
                rkinds[h[1][1]] = h[1][0]
    if along >= 400 or (ln and along / ln >= .2 and along >= 150):
        add("fiumi")
        for nm, _ in sorted(rnames.items(), key=lambda x: -x[1]):
            if rnames[nm] * seg >= 120 and not re.search(r"affluente|senza nome|^[0-9]", nm, re.I):
                shown = nm if re.match(PREFIX, nm.lower()) else ("Fiume " if rkinds[nm] == "f" else "Torrente ") + nm
                add("fiumi", shown)
    # laghi e spiagge: quanto ci si avvicina
    for lines, k, r in ((I.lakes, "laghi", 120), (I.beaches, "spiaggia", 80)):
        best = {}
        for p in sm[::2] if len(sm) > 400 else sm:
            h = lines.near(p, r)
            if h:
                nm = h[1][1] or ""
                if nm not in best or h[0] < best[nm]:
                    best[nm] = h[0]
        if best:
            add(k)
            for nm in sorted(best, key=lambda x: best[x]):
                if nm:
                    add(k, nm)
    # il nome del sentiero dice "cascata" o "lago": allora basta che ci siano vicino (entro 800 m / 500 m)
    text = (text or "").lower()
    if "cascat" in text and "cascate" not in f:
        for p in sm[::3]:
            gi, gj = math.floor(p[0] / G), math.floor(p[1] / G)
            hit = [(bd.hav(p, op), nm) for a in (-2, -1, 0, 1, 2) for b in (-2, -1, 0, 1, 2)
                   for (k, op, r, nm, ex) in I.pts.get((gi + a, gj + b), []) if k == "cascate"]
            hit = [h for h in hit if h[0] <= 800]
            if hit:
                add("cascate", min(hit)[1] or None)
                break
    if re.search(r"\blag(o|hi|hetto)\b", text) and "laghi" not in f:
        for p in sm[::3]:
            h = I.lakes.near(p, 500)
            if h:
                add("laghi", h[1][1] or None)
                break
    # punti notevoli
    G2 = G
    found = {}
    for p in sm[::2] if len(sm) > 500 else sm:
        gi, gj = math.floor(p[0] / G2), math.floor(p[1] / G2)
        for a in (-1, 0, 1):
            for b in (-1, 0, 1):
                for (k, op, r, nm, extra) in I.pts.get((gi + a, gj + b), []):
                    d = bd.hav(p, op)
                    if d <= r:
                        key = (k, op[0], op[1])
                        if key not in found or d < found[key][0]:
                            found[key] = (d, k, op, nm, extra)
    best_peak = None
    out_pk = None
    for (d, k, op, nm, extra) in sorted(found.values(), key=lambda x: x[0]):
        if k == "fontanelle":
            if op not in w:
                w.append(op)
            add(k)
            continue
        if k == "vette" and nm and (best_peak is None or (extra["ele"] or 0) > (best_peak[1] or 0)):
            best_peak = (nm, extra["ele"])
        if k == "vette":
            add(k)
            continue
        add(k, nm or None)
    if best_peak:
        names["vette"] = [best_peak[0] + (f" ({best_peak[1]} m)" if best_peak[1] else "")]
        if best_peak[1]:
            out_pk = best_peak[1]
    # bosco
    sm2 = bd.sample(path, min(250, max(10, round(ln / 80))))
    wood_n = 0
    for p in sm2:
        for (k, bb) in I.boxes.get((math.floor(p[0] / I.BG), math.floor(p[1] / I.BG)), []):
            if k == "bosco" and bb[0] <= p[0] <= bb[2] and bb[1] <= p[1] <= bb[3]:
                wood_n += 1
                break
    wood = wood_n / max(1, len(sm2))
    if wood >= .5:
        add("bosco")
    if kind in ("foot", "walk"):
        add("citta")
    order = ["cascate", "fiumi", "laghi", "spiaggia", "vette", "panorama", "grotte", "storia", "bosco", "fontanelle", "citta"]
    f.sort(key=lambda k: order.index(k) if k in order else 99)
    out = {"f": f, "w": [[round(p[0], 5), round(p[1], 5)] for p in w[:12]], "wood": round(wood, 2)}
    if names:
        out["n"] = names
    if out_pk:
        out["pk"] = out_pk
    return out


# ---------- descrizione ----------
def km(x):
    s = f"{x:.1f}".replace(".", ",")
    return s[:-2] if s.endswith(",0") else s


def num(x):
    return f"{x:,}".replace(",", ".")


def join(items):
    items = [i for i in items if i]
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " e " + items[-1]


SCALE = {"T": "turistico (facile, su sentieri larghi e ben tracciati)", "E": "escursionistico (sentiero vero, serve passo sicuro)",
         "EE": "per escursionisti esperti (tratti ripidi o esposti, attenzione con il cane)", "EEA": "per esperti con attrezzatura (vie ferrate: non adatto ai cani)"}


PREFIX = r"(fiume|torrente|rio|rii|riu|fosso|fossato|vallone|canale|roggia|riale|rivo|ruscello|flumini|fiumara|fiumarella|bach|graben|botro|borro|lama|gora|naviglio)\b"


def river_word(nm):
    m = re.match(r"(fiume|torrente) (.+)$", nm, re.I)
    return f"il {m.group(1).lower()} {m.group(2)}" if m else nm


def place(x):
    """Nome di partenza/arrivo ripulito (tolgo note tra parentesi e pezzi tagliati)."""
    x = re.sub(r"\s*[\(\[].*$", "", x or "").strip(" -–,")
    if len(x) >= 38 and re.search(r" [-–] ", x):
        x = re.split(r" [-–] ", x)[0]
    return x.strip()


def describe(tr, path=None):
    f = tr.get("f") or {}
    fl = f.get("f", [])
    nm = f.get("n", {})
    e = tr.get("e") or {}
    L = tr.get("len", 0) / 1000
    up = e.get("up")
    path = path or bd.chain(tr.get("ways") or [])
    loop = tr.get("loop") or (len(path) > 2 and bd.hav(path[0], path[-1]) < 500) or (tr.get("from") and tr.get("from") == tr.get("to"))
    walk = tr.get("type") == "walk"
    S = []
    fr, to = place(tr.get("from")), place(tr.get("to"))
    # 1. che cos'è e dove
    if walk:
        s = f"Giro ad anello di {km(L)} km in città"
    else:
        s = ("Anello" if loop else "Percorso") + f" di {km(L)} km"
        if fr and to and fr != to and not loop:
            s += f" da {fr} a {to}"
        elif fr and loop:
            s += f" con partenza e arrivo a {fr}"
    if tr.get("zone"):
        s += f", nella zona di {tr['zone']}"
    S.append(s + ".")
    if not walk and not loop:
        S.append(f"Non è un anello: per tornare alla partenza si rifà la stessa strada, quindi in tutto sono {km(2 * L)} km.")
    # 2. fatica
    if up is not None and not walk:
        if up < 100:
            t = "Quasi pianeggiante"
        elif up < 300:
            t = f"Sale in tutto di {num(up)} m: dislivello moderato"
        elif up < 700:
            t = f"Sale in tutto di {num(up)} m: un percorso che fa faticare, anche il cane"
        else:
            t = f"Sale in tutto di {num(up)} m: molto impegnativo, solo per cani allenati"
        if e.get("max") is not None and e["max"] >= 600:
            t += f", fino a {num(e['max'])} m di quota"
        S.append(t + ".")
    elif walk and up is not None:
        S.append("Quasi in piano." if up < 60 else f"Qualche saliscendi ({num(up)} m in tutto).")
    # 3. fondo e ombra
    sf = tr.get("sf", "")
    if sf:
        n = len(sf)
        soft, hard, steps = sf.count("n") / n, sf.count("a") / n, sf.count("g") / n
        bits = []
        if soft >= .5:
            bits.append("il fondo è per lo più di terra o erba, comodo per le zampe")
        elif hard >= .5:
            bits.append("il fondo è per lo più asfalto o pietra: d'estate può scottare le zampe")
        if steps > 0:
            bits.append("ci sono tratti con gradini")
        if bits:
            S.append(bits[0][0].upper() + join(bits)[1:] + ".")
    wood = f.get("wood", 0)
    if wood >= .7:
        S.append("Quasi tutto all'ombra degli alberi.")
    elif wood >= .35:
        S.append(f"Ombra a tratti: circa {round(wood * 10) * 10}% del percorso sotto gli alberi, il resto al sole.")
    elif not walk and "spiaggia" not in fl:
        S.append("Poca ombra: quasi tutto al sole, meglio evitare le ore calde.")
    # 4. cosa si incontra
    seen = []
    if "fiumi" in fl:
        rv = nm.get("fiumi", [])
        seen.append("costeggia " + (join([river_word(x) for x in rv[:2]]) if rv else "un fiume o un torrente"))
    if "laghi" in fl:
        lk = nm.get("laghi", [])
        seen.append("arriva vicino " + (("al " + lk[0]) if lk and re.match(r"(lago|laghetto|invaso)", lk[0], re.I) else (f"al lago {lk[0]}" if lk else "a un lago")))
    if "cascate" in fl:
        cs = nm.get("cascate", [])
        seen.append(("passa accanto alla " + cs[0]) if cs and re.match(r"cascat", cs[0], re.I) else (f"passa accanto a una cascata ({cs[0]})" if cs else "passa accanto a una cascata"))
    if "spiaggia" in fl:
        sp = nm.get("spiaggia", [])
        seen.append("raggiunge " + (("la " + sp[0]) if sp and re.match(r"spiaggia", sp[0], re.I) else (f"la spiaggia {sp[0]}" if sp else "una spiaggia")))
    if "vette" in fl:
        vt = nm.get("vette", [])
        pk = f.get("pk")
        if vt and pk and e.get("max") is not None and e["max"] >= pk - 40:
            seen.append(f"sale fino in vetta ({vt[0]})")
        elif vt:
            seen.append(f"passa sotto una vetta ({vt[0]})")
        else:
            seen.append("passa vicino a una cima")
    if "panorama" in fl:
        seen.append("ha punti panoramici")
    if "grotte" in fl:
        gr = nm.get("grotte", [])
        seen.append(("passa vicino alla " + gr[0]) if gr and re.match(r"grott", gr[0], re.I) else (f"passa vicino a una grotta ({gr[0]})" if gr else "passa vicino a una grotta"))
    if "storia" in fl:
        st = nm.get("storia", [])
        seen.append("incontra luoghi storici" + (f" ({join(st[:2])})" if st else ""))
    if seen:
        S.append((join(seen[:5]))[0].upper() + join(seen[:5])[1:] + ".")
    # 5. acqua e bagno per il cane
    nw = len(f.get("w", []))
    if nw:
        S.append(("Una fontanella" if nw == 1 else f"{nw} fontanelle") + " lungo il percorso per far bere il cane.")
    elif L >= 3 and not walk:
        S.append("Nessuna fontanella segnata: porta acqua per il cane.")
    if any(k in fl for k in ("fiumi", "laghi", "spiaggia")):
        S.append("Dove l'acqua è calma e la riva è facile, il cane può rinfrescarsi (attenzione alla corrente).")
    # 6. segnaletica
    if tr.get("scale") in SCALE:
        S.append(f"Difficoltà CAI {tr['scale']}: {SCALE[tr['scale']]}.")
    if tr.get("cai") and tr.get("ref"):
        S.append(f"Segnavia CAI {tr['ref']}.")
    elif tr.get("ref") and not walk:
        S.append(f"Segnavia {tr['ref']}.")
    dg = tr.get("dg")
    if dg and dg[0] == "no":
        S.append("Attenzione: qui i cani non sono ammessi.")
    elif dg and dg[0] == "lim":
        S.append("Cani ammessi solo su alcuni sentieri o in certi periodi: verifica prima di partire.")
    elif (dg and dg[0] == "lea") or tr.get("dogs") == "leashed":
        S.append("Cani al guinzaglio.")
    elif tr.get("dogs") == "no":
        S.append("Attenzione: sul percorso è segnato il divieto per i cani.")
    return " ".join(S)


# ---------- applicazione ----------
def apply(only=None):
    out_dir = os.path.join(bd.ROOT, "data", "c")
    files = sorted(fn for fn in os.listdir(out_dir) if fn.endswith(".json"))
    if only:
        files = [fn for fn in files if fn[:-5] in only]
    for n, fn in enumerate(files):
        k = fn[:-5]
        lat, lon = map(float, k.split("_"))
        dst = os.path.join(out_dir, fn)
        data = json.load(open(dst, encoding="utf-8"))
        I = index_for((lat, lon))
        for tr in data["trails"]:
            path = bd.chain(tr["ways"])
            tr["f"] = features(path, tr["len"], tr.get("type"), I, " ".join([tr["name"], tr.get("from", ""), tr.get("to", "")]))
            tr["d"] = describe(tr, path)
        # rileggo subito prima di scrivere: se un altro script ha aggiunto sentieri nel frattempo, li tengo
        now = json.load(open(dst, encoding="utf-8"))["trails"]
        mine = {t["id"]: t for t in data["trails"]}
        merged = [mine.get(t["id"], t) for t in now]
        json.dump({"trails": merged}, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        log(f"[{n + 1}/{len(files)}] {k}: {len(data['trails'])} sentieri")
    # cambio la "versione" dell'indice, così i telefoni riscaricano i riquadri
    idxf = os.path.join(bd.ROOT, "data", "index.json")
    I = json.load(open(idxf))
    I["t"] = int(time.time() * 1000)
    json.dump(I, open(idxf, "w"), separators=(",", ":"))


def check(tid):
    out_dir = os.path.join(bd.ROOT, "data", "c")
    for fn in os.listdir(out_dir):
        for tr in json.load(open(os.path.join(out_dir, fn), encoding="utf-8"))["trails"]:
            if str(tr["id"]) == str(tid):
                lat, lon = map(float, fn[:-5].split("_"))
                print("prima:", tr.get("f", {}).get("f"))
                tr["f"] = features(bd.chain(tr["ways"]), tr["len"], tr.get("type"), index_for((lat, lon)), " ".join([tr["name"], tr.get("from", ""), tr.get("to", "")]))
                print("dopo: ", tr["f"]["f"], tr["f"].get("n"))
                print(describe(tr))
                return


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "fetch":
        fetch(set(sys.argv[2:]) or None)
    elif cmd == "apply":
        apply(set(sys.argv[2:]) or None)
    elif cmd == "check":
        check(sys.argv[2])
    else:
        print(__doc__)
