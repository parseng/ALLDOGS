# Elenco leggero di tutti i sentieri (nome, numero, zona, riquadro, partenza, lunghezza) per la ricerca in tutta Italia.
# Colonne: id, nome, numero, zona, riquadro, lat, lon, lunghezza dell'andata (m), lunghezza totale (con il ritorno alla partenza se non è un anello), cani ("no", "lim", "lea", "ok" o "").
# Va rilanciato dopo ogni aggiornamento di data/c/*.json:   python tools/build_names.py
import json, glob, os, time
import build_data as bd
root = os.path.join(os.path.dirname(__file__), "..", "data")
rows = []
for f in sorted(glob.glob(os.path.join(root, "c", "*.json"))):
    cell = os.path.basename(f)[:-5]
    d = json.load(open(f, encoding="utf-8"))
    for t in d["trails"]:
        p = t["ways"][0][0]
        path = bd.chain(t["ways"])
        ln = t.get("len", 0)
        ret = 0 if t.get("type") == "walk" else bd.ret_info(path, ln)
        dg = (t.get("dg") or [""])[0]
        rows.append([t["id"], t.get("name", ""), t.get("ref", "") or "", t.get("zone", "") or "", cell, round(p[0], 4), round(p[1], 4), ln, round(ln + ret), dg])
json.dump({"t": int(time.time() * 1000), "r": rows}, open(os.path.join(root, "names.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(rows), "sentieri")
