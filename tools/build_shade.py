"""Ombra vera lungo ogni sentiero, dalla mappa satellitare degli alberi ESA WorldCover (10 m, 2021).

Prima l'ombra si stimava dai "riquadri" dei boschi di OpenStreetMap: un bosco a forma di anello (come quello intorno al Gran Cono del Vesuvio)
faceva sembrare all'ombra anche la cima spoglia. Ora si guarda, ogni 20 metri del percorso, se ci sono alberi lì e nei 10 metri intorno.

Uso:
  python tools/build_shade.py apply [cella ...]   # aggiorna f.wood (quota all'ombra), f.sh (ombra tratto per tratto), "bosco" e la descrizione
  python tools/build_shade.py check <id>

Fonte: ESA WorldCover 10 m 2021 v200 (© ESA WorldCover project, CC BY 4.0), letta direttamente da AWS Open Data (serve la libreria rasterio).
Regola: un punto è "all'ombra" se almeno 5 dei 9 quadratini da 10 m intorno a lui sono alberi (classe 10).
"""
import json, math, os, sys, time

import numpy as np
import rasterio
from rasterio.windows import from_bounds

import build_data as bd
import build_feats as bf

DATA = os.path.join(bd.ROOT, "data", "c")
URL = "/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{}_Map.tif"
PX = 1 / 12000  # 10 m circa
STEP = 20
SEG = 100  # f.sh: un carattere ogni 100 m ("1" ombra, "0" sole)


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def tile_name(lat, lon):
    la, lo = int(math.floor(lat / 3) * 3), int(math.floor(lon / 3) * 3)
    return f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}", la, lo


def read_box(s, w, n, e):
    """Classi WorldCover nel riquadro, anche a cavallo di più file da 3 gradi."""
    H, W = int(round((n - s) / PX)), int(round((e - w) / PX))
    out = np.zeros((H, W), dtype=np.uint8)
    lat = math.floor(s / 3) * 3
    while lat < n:
        lon = math.floor(w / 3) * 3
        while lon < e:
            name, la, lo = tile_name(lat + .1, lon + .1)
            a, b, c, d = max(s, la), max(w, lo), min(n, la + 3), min(e, lo + 3)
            try:
                with rasterio.open(URL.format(name)) as ds:
                    arr = ds.read(1, window=from_bounds(b, a, d, c, ds.transform))
                r0, c0 = int(round((n - c) / PX)), int(round((b - w) / PX))
                hh, ww = min(arr.shape[0], H - r0), min(arr.shape[1], W - c0)
                out[r0:r0 + hh, c0:c0 + ww] = arr[:hh, :ww]
            except Exception as ex:  # mare aperto: il file non esiste
                if "404" not in str(ex) and "not recognized" not in str(ex) and "No such file" not in str(ex):
                    log("   ", name, str(ex)[:100])
            lon += 3
        lat += 3
    return out


class Box:
    def __init__(self, cell, margin=.15):
        self.s, self.w = cell[0] - margin, cell[1] - margin
        self.n, self.e = cell[0] + .5 + margin, cell[1] + .5 + margin
        self.a = read_box(self.s, self.w, self.n, self.e)
        self.tree = (self.a == 10).astype(np.uint8)

    def shaded(self, p):
        r, c = int((self.n - p[0]) / PX), int((p[1] - self.w) / PX)
        if r < 1 or c < 1 or r >= self.a.shape[0] - 1 or c >= self.a.shape[1] - 1:
            return None
        return int(self.tree[r - 1:r + 2, c - 1:c + 2].sum()) >= 5


def shade(tr, box):
    path = bd.chain(tr["ways"])
    sm = bd.resample(path, STEP) if tr.get("len", 0) > STEP * 2 else path
    vals = [box.shaded(p) for p in sm]
    known = [v for v in vals if v is not None]
    if not known:
        return None, ""
    frac = sum(known) / len(known)
    per = max(1, round(SEG / STEP))
    segs = []
    for i in range(0, len(vals), per):
        k = [v for v in vals[i:i + per] if v is not None]
        segs.append("1" if k and sum(k) * 2 >= len(k) else "0")
    sh = "".join(segs)
    return round(frac, 2), sh


def update(tr, box):
    f = tr.get("f")
    if not isinstance(f, dict):
        f = tr["f"] = {"f": [], "w": []}
    frac, sh = shade(tr, box)
    if frac is None:
        return
    f["wood"] = frac
    f["sh"] = sh
    fl = f.setdefault("f", [])
    if frac >= .5 and "bosco" not in fl:
        fl.append("bosco")
        order = ["cascate", "fiumi", "laghi", "spiaggia", "vette", "panorama", "grotte", "storia", "bosco", "fontanelle", "citta"]
        fl.sort(key=lambda k: order.index(k) if k in order else 99)
    elif frac < .5 and "bosco" in fl:
        fl.remove("bosco")
    tr["d"] = bf.describe(tr)


def apply(only=None):
    files = sorted(fn for fn in os.listdir(DATA) if fn.endswith(".json"))
    if only:
        files = [fn for fn in files if fn[:-5] in only]
    for n, fn in enumerate(files):
        k = fn[:-5]
        cell = tuple(map(float, k.split("_")))
        dst = os.path.join(DATA, fn)
        data = json.load(open(dst, encoding="utf-8"))
        box = Box(cell)
        changed = 0
        for tr in data["trails"]:
            before = (tr.get("f") or {}).get("wood")
            update(tr, box)
            if before is not None and abs(before - (tr.get("f") or {}).get("wood", before)) >= .3:
                changed += 1
        json.dump(data, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        log(f"[{n + 1}/{len(files)}] {k}: {len(data['trails'])} sentieri, {changed} con l'ombra cambiata molto")


def check(tid):
    for fn in sorted(os.listdir(DATA)):
        for tr in json.load(open(os.path.join(DATA, fn), encoding="utf-8"))["trails"]:
            if str(tr["id"]) == str(tid):
                box = Box(tuple(map(float, fn[:-5].split("_"))))
                print(tr["name"], "prima:", (tr.get("f") or {}).get("wood"), "dopo:", shade(tr, box))
                return


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "apply":
        apply(set(sys.argv[2:]) or None)
    elif cmd == "check":
        check(sys.argv[2])
    else:
        print(__doc__)
