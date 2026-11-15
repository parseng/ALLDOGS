# Elenco leggero di tutti i luoghi per il cane in Italia (solo tipo e posizione), per vederli sulla mappa anche da lontano,
# raggruppati in cerchi con il numero. Va rilanciato dopo ogni aggiornamento di data/p/*.json:   python tools/build_poiall.py
import json, glob, os, time
root = os.path.join(os.path.dirname(__file__), "..", "data")
out = {"a": [], "v": [], "s": [], "g": []}
for f in sorted(glob.glob(os.path.join(root, "p", "*.json"))):
    if os.path.basename(f) == "all.json":
        continue
    for p in json.load(open(f, encoding="utf-8"))["poi"]:
        if p[0] in out:
            out[p[0]].append([round(p[1], 4), round(p[2], 4)])
out["t"] = int(time.time() * 1000)
json.dump(out, open(os.path.join(root, "p", "all.json"), "w"), separators=(",", ":"))
print({k: len(v) for k, v in out.items() if k != "t"})
