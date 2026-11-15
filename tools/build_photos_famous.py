# Foto dei sentieri famosi (lista FAMOUS in index.html), cercate per nome su Wikimedia Commons.
# Da lanciare DOPO tools/build_photos.py: mette queste foto per prime nei sentieri che corrispondono
# e scrive data/ph/famous.json = {nome: [foto]} per le schede "Consigliati" senza tracciato.
# Uso: python tools/build_photos_famous.py
import json, math, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_photos import get, hav, words, BAD, CDIR, ODIR, HERE

def famous():
    t = open(os.path.join(HERE, "index.html"), encoding="utf-8").read()
    a = t.find("const FAMOUS=["); b = t.find("];", a)
    out = []
    for m in re.finditer(r'\{n:"([^"]+)",re:/(.+?)/i,c:\[([0-9.]+),([0-9.]+)\]', t[a:b]):
        out.append({"n": m.group(1), "re": re.compile(m.group(2), re.I), "c": (float(m.group(3)), float(m.group(4)))})
    return out

ALT = {"Gran Cono del Vesuvio": "Cratere del Vesuvio"}
def search(f):
    d = get({"action": "query", "format": "json", "generator": "search", "gsrsearch": "filetype:bitmap " + ALT.get(f["n"], f["n"]), "gsrnamespace": 6,
             "gsrlimit": 15, "prop": "imageinfo|coordinates", "iiprop": "url|extmetadata|size", "iiurlwidth": 640})
    nw = words(f["n"]) | words(ALT.get(f["n"], ""))
    res = []
    for p in sorted(d.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 99)):
        t = p["title"]
        if not re.search(r"\.jpe?g$", t, re.I) or BAD.search(t):
            continue
        co = (p.get("coordinates") or [{}])[0]
        near = "lat" in co and hav((co["lat"], co["lon"]), f["c"]) <= 15000
        if not (near or nw & words(t)):
            continue
        ii = (p.get("imageinfo") or [{}])[0]; m = ii.get("extmetadata", {})
        lic = m.get("LicenseShortName", {}).get("value", "")
        if not re.search(r"CC|Public domain|PD", lic, re.I) or (ii.get("width") or 0) < 800:
            continue
        art = re.sub(r"<[^>]+>", "", m.get("Artist", {}).get("value", "")).strip()[:80] or "autore su Commons"
        res.append({"u": ii.get("thumburl"), "w": ii.get("thumbwidth"), "h": ii.get("thumbheight"), "a": art, "l": lic, "p": ii.get("descriptionurl")})
        if len(res) >= 4:
            break
    return res

def cell_of(la, lo):
    return f"{math.floor(la / .5) * .5:.1f}_{math.floor(lo / .5) * .5:.1f}"

if __name__ == "__main__":
    fam, out = famous(), {}
    for f in fam:
        ph = search(f); time.sleep(0.3)
        if not ph:
            print("nessuna foto:", f["n"]); continue
        out[f["n"]] = ph
        la, lo = f["c"]; n = 0
        for dla in (-.5, 0, .5):
            for dlo in (-.5, 0, .5):
                k = cell_of(la + dla, lo + dlo); cp = os.path.join(CDIR, k + ".json")
                if not os.path.exists(cp):
                    continue
                tr = json.load(open(cp, encoding="utf-8"))["trails"]
                hit = []
                for t in tr:
                    if not f["re"].search(t["name"]):
                        continue
                    ways = t["ways"] if isinstance(t["ways"], list) else json.loads(t["ways"])
                    if ways and hav(ways[0][0], f["c"]) <= 15000:
                        hit.append(str(t["id"]))
                if not hit:
                    continue
                pp = os.path.join(ODIR, k + ".json")
                cur = json.load(open(pp, encoding="utf-8")) if os.path.exists(pp) else {}
                for tid in hit:
                    old = [x for x in cur.get(tid, []) if x["u"] not in {y["u"] for y in ph}]
                    cur[tid] = (ph + old)[:4]; n += 1
                json.dump(cur, open(pp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        print(f"{f['n']}: {len(ph)} foto, {n} sentieri", flush=True)
    json.dump(out, open(os.path.join(ODIR, "famous.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    idx = {f[:-5]: 1 for f in os.listdir(ODIR) if re.match(r"^-?\d", f)}
    json.dump({"t": int(time.time()), "cells": idx}, open(os.path.join(ODIR, "index.json"), "w"), separators=(",", ":"))
    print("fatto")
