"""Cani ammessi o no, sentiero per sentiero (campo "dg" dei sentieri in data/c/*.json).

Uso:
  python tools/build_dogs.py fetch          # scarica da OpenStreetMap (Overpass) parchi, riserve e cartelli "dog=*", riquadro per riquadro
  python tools/build_dogs.py zip            # mette i file scaricati in .cache/dogs.zip (per spostarli su un altro computer)
  python tools/build_dogs.py apply [cella]  # scrive "dg" in data/c/*.json
  python tools/build_dogs.py check <id>     # mostra cosa trova per un sentiero

Da dove viene l'informazione (in ordine di forza):
  1. Le regole dei parchi e delle riserve scritte qui sotto (RULES), prese dai regolamenti ufficiali o dalle pagine dei parchi.
  2. I cartelli "dog=no / leashed / yes" messi su OpenStreetMap sui tratti del sentiero.
  3. Le aree protette di OpenStreetMap senza una regola nota: nelle aree protette il cane va tenuto al guinzaglio.
  4. Fuori dalle aree protette, senza cartelli: nessun divieto conosciuto.

Il risultato "dg" è [stato, testo, nome dell'area] con stato:
  "no"  cani vietati          "lim" ammessi solo su alcuni sentieri o in certi periodi: verificare
  "lea" ammessi al guinzaglio "ok"  nessun divieto conosciuto
"""
import json, math, os, re, sys, time, zipfile

import build_data as bd
import build_italy as bi
import build_feats as bf

DOGS_RAW = os.path.join(bd.CACHE, "dogs")
DATA = os.path.join(bd.ROOT, "data", "c")
REL = bi.REL


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


# ---------- regole dei parchi ----------
# (espressione sul nome dell'area, stato, testo per chi usa l'app, fonte). La prima che corrisponde vince.
# Sentieri con regola propria: ("Maiella", {"A1", ...}) -> stato per i sentieri con quel numero.
MAJELLA_OK = {"A1", "A3", "B6", "C1", "C2", "C3", "D1", "D2", "D3", "D4", "E4", "L2", "L7", "M1", "M4", "N1", "O2", "P2", "P3", "Q10", "R1", "R8", "S2",
              "T1", "T2", "T3", "T4"}
SIBILLINI_NO = {"E6", "E8", "E15", "E17"}
RULES = [
    (r"gran paradiso", "no",
     "Parco Nazionale Gran Paradiso: i cani non possono entrare nel parco, anche al guinzaglio. Eccezioni: le aree di fondovalle e, solo dal 15 luglio "
     "al 15 settembre, alcuni sentieri segnalati dal parco (sempre al guinzaglio).", "pngp.it, Regolamento, art. 11"),
    (r"\bmandria\b", "no", "Parco La Mandria: gli animali domestici non sono ammessi.", "regolamento del parco"),
    (r"parco (naturale |regionale )*(della )?maremma", "no", "Parco della Maremma: i cani non sono ammessi.", "regolamento del parco"),
    (r"asinara", "no", "Parco Nazionale dell'Asinara: i cani non sono ammessi.", "regolamento del parco"),
    (r"crava.?morozzo", "no", "Riserva di Crava Morozzo: i cani non possono entrare.", "areeprotettealpimarittime.it"),
    (r"mercantour", "no", "Parc national du Mercantour (Francia): i cani sono vietati, multa di 135 euro.", "areeprotettealpimarittime.it"),
    (r"\boasi\b.*\bwwf\b|\bwwf\b.*\boasi\b", "no", "Oasi WWF: di solito i cani non sono ammessi. Verifica all'ingresso.", "regole delle Oasi WWF"),
    (r"integrale", "no", "Riserva integrale: l'accesso è vietato o molto limitato, i cani non sono ammessi.", "legge 394/1991"),
    (r"abruzzo,? lazio|parco nazionale d.abruzzo", "lim",
     "Parco Nazionale d'Abruzzo, Lazio e Molise: i cani sono ammessi solo su circa 88 dei 153 sentieri, sempre al guinzaglio. Nelle zone A sono vietati. "
     "Controlla la scheda del sentiero su parcoabruzzo.it.", "parcoabruzzo.it, disciplinare 2020"),
    (r"maiella|majella", "lim",
     "Parco Nazionale della Maiella: nella zona A i cani sono vietati; sugli altri sentieri al guinzaglio. Controlla l'elenco «Sentieri a 6 zampe» del parco.",
     "parcomajella.it, Sentieri a 6 zampe"),
    (r"sibillini", "lea",
     "Parco Nazionale dei Monti Sibillini: cani al guinzaglio e solo sui sentieri segnati. Vietati sui sentieri E6, E8, E15 ed E17.", "sibillini.net"),
    (r"alpi marittime|marguareis", "lim",
     "Aree protette delle Alpi Marittime: cani al guinzaglio solo sui principali itinerari indicati dal parco.", "areeprotettealpimarittime.it"),
]
GENERIC_PARK = "Area protetta: tieni il cane al guinzaglio e resta sui sentieri. Guarda i cartelli all'ingresso."


def rule_for(name):
    n = (name or "").lower()
    for rx, st, txt, src in RULES:
        if re.search(rx, n):
            return st, txt, src
    return None


# ---------- scaricamento ----------
def fetch(only=None):
    os.makedirs(DOGS_RAW, exist_ok=True)
    # tutti i riquadri che hanno sentieri nell'app (anche quelli di confine)
    order = sorted((tuple(map(float, f[:-5].split("_"))) for f in os.listdir(DATA) if f.endswith(".json")), key=lambda c: bd.hav(c, bi.HOME))
    if only:
        order = [c for c in order if bi.key(c) in only]
    for n, c in enumerate(order):
        k = bi.key(c)
        B = f"{c[0]},{c[1]},{c[0] + bi.CELL},{c[1] + bi.CELL}"
        dst = os.path.join(DOGS_RAW, f"w_{k}.json")
        if not os.path.exists(dst):
            log(f"[{n + 1}/{len(order)}] cartelli dog=* {k}")
            # sentieri (solo l'elenco dei pezzi) e i loro pezzi con un'indicazione per i cani
            q = f'[out:json][timeout:300];{REL}({B})->.r;.r out body;way(r.r)["dog"];out tags;'
            if not bi.curl_overpass(q, dst):
                log("   saltato per ora")
        dst = os.path.join(DOGS_RAW, f"b_{k}.json")
        if not os.path.exists(dst):
            log(f"[{n + 1}/{len(order)}] aree protette {k}")
            q = (f'[out:json][timeout:300][maxsize:1800000000];(wr["boundary"~"^(national_park|protected_area)$"]({B});wr["leisure"="nature_reserve"]({B});'
                 f'wr["leisure"="dog_park"]({B}););out body geom;')  # body: servono i pezzi (members) delle relation
            if not bi.curl_overpass(q, dst):
                log("   saltato per ora")
    log("Scaricamento finito")


def make_zip():
    z = os.path.join(bd.CACHE, "dogs.zip")
    with zipfile.ZipFile(z, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(os.listdir(DOGS_RAW)):
            if f.endswith(".json"):
                zf.write(os.path.join(DOGS_RAW, f), f)
    log("Creato", z, round(os.path.getsize(z) / 1e6, 1), "MB")


# ---------- poligoni ----------
def rings_of(el):
    """Anelli esterni e interni di un'area (way chiusa o relation multipoligono)."""
    if el["type"] == "way":
        g = [(p["lat"], p["lon"]) for p in el.get("geometry", []) if p]
        return ([g] if len(g) >= 4 else []), []
    outer, inner = [], []
    for m in el.get("members", []):
        if m.get("type") != "way" or not m.get("geometry"):
            continue
        g = [(p["lat"], p["lon"]) for p in m["geometry"] if p]
        if len(g) < 2:
            continue
        (inner if m.get("role") == "inner" else outer).append(g)
    return join(outer), join(inner)


def join(segs):
    """Unisce i pezzi di confine in anelli chiusi (i pezzi possono essere al contrario)."""
    segs = [list(s) for s in segs]
    out = []
    while segs:
        ring = segs.pop()
        changed = True
        while changed and ring[0] != ring[-1]:
            changed = False
            for i, s in enumerate(segs):
                if s[0] == ring[-1]:
                    ring += s[1:]
                elif s[-1] == ring[-1]:
                    ring += s[-2::-1]
                elif s[-1] == ring[0]:
                    ring = s[:-1] + ring
                elif s[0] == ring[0]:
                    ring = s[:0:-1] + ring
                else:
                    continue
                segs.pop(i)
                changed = True
                break
        if len(ring) >= 4:
            out.append(ring)  # anche se non chiuso del tutto: lo chiudo io
    return out


def inside(p, ring):
    y, x = p
    c = False
    j = len(ring) - 1
    for i in range(len(ring)):
        yi, xi = ring[i]
        yj, xj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-12) + xi:
            c = not c
        j = i
    return c


class Area:
    def __init__(self, el):
        t = el.get("tags", {})
        self.id = f'{el["type"][0]}{el["id"]}'
        self.name = t.get("name:it") or t.get("name") or t.get("official_name") or ""
        self.tags = t
        self.outer, self.inner = rings_of(el)
        pts = [p for r in self.outer for p in r]
        self.bb = (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)) if pts else None
        self.dog = t.get("dog", "")
        self.kind = "dogpark" if t.get("leisure") == "dog_park" else "area"
        # le zone A / riserve integrali sono le più severe
        # solo le riserve "integrali" vere: protect_class=1 su OpenStreetMap in Italia è usato anche per riserve dove si cammina col cane
        self.strict = "integrale" in self.name.lower() or (t.get("access") == "no" and t.get("protect_class", "") in ("1", "1a"))

    def has(self, p):
        if not self.bb or not (self.bb[0] <= p[0] <= self.bb[2] and self.bb[1] <= p[1] <= self.bb[3]):
            return False
        return any(inside(p, r) for r in self.outer) and not any(inside(p, r) for r in self.inner)


_areas = {"key": None, "v": None}


def areas_near(c):
    near = tuple(sorted((c[0] + a * bi.CELL, c[1] + b * bi.CELL) for a in (-1, 0, 1) for b in (-1, 0, 1)))
    if _areas["key"] == near:
        return _areas["v"]
    seen, out = set(), []
    for cc in near:
        f = os.path.join(DOGS_RAW, f"b_{bi.key(cc)}.json")
        if not os.path.exists(f):
            continue
        for el in json.load(open(f, encoding="utf-8")).get("elements", []):
            k = f'{el["type"][0]}{el["id"]}'
            if k in seen:
                continue
            seen.add(k)
            a = Area(el)
            if a.bb and a.kind == "area":
                out.append(a)
    _areas["key"], _areas["v"] = near, out
    return out


def way_dogs(c):
    """{id sentiero: [valori dog=* dei suoi pezzi]}"""
    f = os.path.join(DOGS_RAW, f"w_{bi.key(c)}.json")
    if not os.path.exists(f):
        return None
    els = json.load(open(f, encoding="utf-8")).get("elements", [])
    wd = {e["id"]: e.get("tags", {}).get("dog", "") for e in els if e["type"] == "way"}
    out = {}
    for e in els:
        if e["type"] == "relation":
            v = [wd[m["ref"]] for m in e.get("members", []) if m.get("type") == "way" and m["ref"] in wd]
            if e.get("tags", {}).get("dog"):
                v.append(e["tags"]["dog"])
            if v:
                out[str(e["id"])] = v
    return out


RANK = {"ok": 0, "lea": 1, "lim": 2, "no": 3}


def judge(t, c, wdog):
    path = [p for w in t["ways"] for p in w]
    sm = bd.sample(path, min(40, max(6, round(t["len"] / 250)))) if len(path) > 1 else path
    best = None  # (stato, testo, nome)
    hits = {}
    for a in areas_near(c):
        n = sum(1 for p in sm if a.has(p))
        if n:
            hits[a.id] = (a, n / len(sm))
    ref = (t.get("ref") or "").upper().replace(" ", "")
    for a, frac in sorted(hits.values(), key=lambda x: -x[1]):
        if frac < .15:
            continue  # sfiora appena il confine
        r = rule_for(a.name)
        if r:
            st, txt, src = r
            nm = a.name
            if "maiella" in nm.lower() or "majella" in nm.lower():
                if ref in MAJELLA_OK:
                    st, txt = "lea", "Parco della Maiella: questo sentiero è nell'elenco «Sentieri a 6 zampe», percorribile col cane al guinzaglio."
            if "sibillini" in nm.lower() and ref in SIBILLINI_NO:
                st, txt = "no", f"Parco dei Monti Sibillini: sul sentiero {ref} i cani sono vietati."
        elif a.dog in ("no",):
            st, txt = "no", f"{a.name or 'Area protetta'}: secondo OpenStreetMap i cani non sono ammessi."
        elif a.strict:
            st, txt = "no", f"{a.name or 'Riserva integrale'}: area a tutela integrale, i cani non sono ammessi."
        elif a.dog == "yes":
            st, txt = "ok", f"{a.name}: cani ammessi (OpenStreetMap)."
        else:
            st, txt = "lea", (f"{a.name}: area protetta, tieni il cane al guinzaglio e resta sui sentieri. Guarda i cartelli all'ingresso." if a.name else GENERIC_PARK)
        if best is None or RANK[st] > RANK[best[0]]:
            best = (st, txt, a.name)
    v = (wdog or {}).get(str(t["id"]), [])
    if "no" in v:
        nb = sum(1 for x in v if x == "no")
        cand = ("no", "Secondo OpenStreetMap su questo sentiero i cani non sono ammessi" + (" in alcuni tratti." if nb < len(v) else "."), best[2] if best else "")
        if best is None or RANK["no"] > RANK[best[0]]:
            best = cand
    elif "leashed" in v and (best is None or RANK[best[0]] < RANK["lea"]):
        best = ("lea", "Cani ammessi al guinzaglio (cartelli segnati su OpenStreetMap).", best[2] if best else "")
    elif best is None and v and all(x in ("yes", "unleashed") for x in v):
        best = ("ok", "Cani ammessi (segnato su OpenStreetMap)." + (" Anche liberi." if "unleashed" in v else ""), "")
    if best is None:
        best = ("ok", "Nessun divieto per i cani conosciuto. Porta sempre il guinzaglio e guarda i cartelli.", "")
    return [best[0], best[1], best[2] or ""]


def apply(only=None):
    files = sorted(f for f in os.listdir(DATA) if f.endswith(".json"))
    tot = {}
    for f in files:
        k = f[:-5]
        if only and k not in only:
            continue
        la, lo = map(float, k.split("_"))
        c = (la, lo)
        fp = os.path.join(DATA, f)
        d = json.load(open(fp, encoding="utf-8"))
        wdog = way_dogs(c)
        if wdog is None or not os.path.exists(os.path.join(DOGS_RAW, f"b_{k}.json")):
            log(k, "senza dati scaricati: salto")
            continue
        for t in d["trails"]:
            t["dg"] = judge(t, c, wdog)
            tot[t["dg"][0]] = tot.get(t["dg"][0], 0) + 1
        json.dump(d, open(fp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        log(k, len(d["trails"]), "sentieri")
    log("Fatto:", tot)


def export():
    """Solo i risultati {id: dg} in tools/dg.json.gz (piccolo, si può mettere su git e applicare su un altro computer con "import")."""
    import gzip
    out, n = {}, 0
    for f in sorted(os.listdir(DATA)):
        if not f.endswith(".json"):
            continue
        k = f[:-5]
        c = tuple(map(float, k.split("_")))
        wdog = way_dogs(c)
        if wdog is None or not os.path.exists(os.path.join(DOGS_RAW, f"b_{k}.json")):
            log(k, "senza dati: salto")
            continue
        for t in json.load(open(os.path.join(DATA, f), encoding="utf-8"))["trails"]:
            out[str(t["id"])] = judge(t, c, wdog)
            n += 1
        log(k)
    dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dg.json.gz")
    with gzip.open(dst, "wt", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"))
    log("Scritto", dst, n, "sentieri")


def import_dg():
    import gzip, time as _t
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dg.json.gz")
    m = json.load(gzip.open(src, "rt", encoding="utf-8"))
    tot = {}
    for f in sorted(os.listdir(DATA)):
        if not f.endswith(".json"):
            continue
        fp = os.path.join(DATA, f)
        d = json.load(open(fp, encoding="utf-8"))
        for t in d["trails"]:
            g = m.get(str(t["id"]))
            if g:
                t["dg"] = g
                tot[g[0]] = tot.get(g[0], 0) + 1
            t["d"] = bf.describe(t)
        json.dump(d, open(fp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    idxf = os.path.join(bd.ROOT, "data", "index.json")
    I = json.load(open(idxf))
    I["t"] = int(_t.time() * 1000)
    json.dump(I, open(idxf, "w"), separators=(",", ":"))
    log("Fatto:", tot)


def check(tid):
    for f in sorted(os.listdir(DATA)):
        d = json.load(open(os.path.join(DATA, f), encoding="utf-8"))
        for t in d["trails"]:
            if str(t["id"]) == str(tid):
                la, lo = map(float, f[:-5].split("_"))
                print(t["name"], judge(t, (la, lo), way_dogs((la, lo))))
                return


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    rest = sys.argv[2:]
    if cmd == "fetch":
        fetch(set(rest) or None)
    elif cmd == "zip":
        make_zip()
    elif cmd == "apply":
        apply(set(rest) or None)
    elif cmd == "check":
        check(rest[0])
    elif cmd == "export":
        export()
    elif cmd == "import":
        import_dg()
    else:
        print(__doc__)
