# Toglie dai sentieri le foto che non c'entrano (macchine, moto, treni, persone in posa, interni, cibo, eventi,
# insetti in primo piano...), guardando le categorie della foto su Wikimedia Commons e non solo il nome del file.
# Uso: python tools/pulisci_foto.py            (tutti i file di data/ph, riprende da dove si era fermato)
#      python tools/pulisci_foto.py 40.5_14.0  (solo questi riquadri)
import json, os, re, subprocess, sys, time, urllib.parse

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PH = os.path.join(HERE, "data", "ph")
CACHE = os.path.join(HERE, "tools", ".cache_cat_foto.json")
UA = "AllDogs/1.0 (https://parseng.github.io/ALLDOGS/)"
API = "https://commons.wikimedia.org/w/api.php"

MARCHE = r"fiat|alfa.?romeo|lancia|ferrari|maserati|lamborghini|porsche|bmw|mercedes|volkswagen|vw |audi|renault|peugeot|citro[eë]n|opel|toyota|ford|nissan|hyundai|kia|skoda|seat |dacia|volvo|jeep|land.?rover|mini cooper|smart fortwo|iveco|scania|vespa|piaggio|ducati|honda|yamaha|kawasaki|suzuki|harley|aprilia|moto guzzi|ape 50"
CAT_BAD = re.compile(
    r"(automobil|\bcars?\b|(?<!aerial )vehicles?\b|veicol|trucks?\b|lorr|camion|buses\b|\bbus\b|minibus|motorcycl|motorbike|scooter|tractors?\b|trattor|locomotiv|rail(way)? vehicles|trains?\b|train stations|trams?\b|tramway|aeroplan|airplan|helicopter|"
    r"license plates|parking|parcheggi|gas stations|petrol|car shows|motor ?shows|rall(y|ies)|motor racing|races\b|giro d.italia|cycling races|cyclists|marathon|"
    r"portraits?|selfies|groups of people|crowds|weddings|paintings|drawings|engravings|lithographs|"
    r"interiors?\b|interni|indoor|museum|musei|exhibit|mostra|food\b|cibo|dishes|cuisine|restaurants?|ristorant|bars? in|caf[eé]s? in|shops? in|negozi|markets? in|"
    r"events?\b|festival|concert|sagre|parades?|processioni|demonstrations|protests|military|police|carabinieri|firefighters|vigili del fuoco|accidents|incidenti|construction sites|cantieri|"
    r"insects|arthropods|spiders|araneae|lepidoptera|butterflies|moths|coleoptera|beetles|diptera|hymenoptera|bees\b|wasps|"
    r"signs\b|road signs|segnaletica|graffiti|posters|advertis|documents|maps of|charts|diagrams|logos|coats of arms|"
    r"stamps|coins|banknotes|aerial photographs|satellite pictures|views from (aircraft|airplanes))", re.I)
TITOLO_BAD = re.compile(r"(" + MARCHE + r"|targa|auto d.epoca|raduno|corteo|matrimonio|sposi|ritratto|selfie|ristorante|pizza|panino|menu|scontrino)", re.I)


def get(params, tries=4):
    url = API + "?" + urllib.parse.urlencode(params)
    for k in range(tries):
        r = subprocess.run(["curl", "-s", "-L", "--max-time", "60", "-A", UA, url], capture_output=True)
        try:
            return json.loads(r.stdout)
        except Exception:
            time.sleep(3 * (k + 1))
    return {}


def titolo(foto):
    p = foto.get("p") or ""
    m = re.search(r"/wiki/(File:.+)$", p)
    return urllib.parse.unquote(m.group(1)).replace("_", " ") if m else None


def categorie(titoli, cache):
    manca = [t for t in titoli if t not in cache]
    for i in range(0, len(manca), 50):
        parte = manca[i:i + 50]
        d = get({"action": "query", "format": "json", "prop": "categories", "cllimit": "max", "clshow": "!hidden", "titles": "|".join(parte)})
        norm = {n["to"]: n["from"] for n in d.get("query", {}).get("normalized", [])}
        for pg in d.get("query", {}).get("pages", {}).values():
            t = norm.get(pg.get("title"), pg.get("title"))
            cache[t] = [c["title"][9:] for c in pg.get("categories", [])]
        for t in parte:
            cache.setdefault(t, [])
        time.sleep(.3)


def da_togliere(t, cats):
    if TITOLO_BAD.search(t):
        return "titolo"
    for c in cats:
        if CAT_BAD.search(c):
            return c
    return None


def main(celle):
    cache = json.load(open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    fatti = set(cache.get("__fatti__", []))
    tot = tolte = 0
    for fn in sorted(os.listdir(PH)):
        k = fn[:-5]
        if not fn.endswith(".json") or (celle and k not in celle) or (not celle and k in fatti):
            continue
        d = json.load(open(os.path.join(PH, fn), encoding="utf-8"))
        tit = [titolo(f) for lst in d.values() if isinstance(lst, list) for f in lst if isinstance(f, dict)]
        categorie([t for t in tit if t], cache)
        cambiato = False
        for sid, lst in list(d.items()):
            if not isinstance(lst, list):
                continue
            nuova = []
            for f in lst:
                if not isinstance(f, dict):
                    nuova.append(f); continue
                t = titolo(f)
                tot += 1
                motivo = da_togliere(t, cache.get(t, [])) if t else None
                if motivo:
                    tolte += 1; cambiato = True
                    print(f"  {k} tolta: {t[:70]}  ({motivo[:40]})", flush=True)
                else:
                    nuova.append(f)
            if nuova:
                d[sid] = nuova
            else:
                d.pop(sid); cambiato = True
        if cambiato:
            json.dump(d, open(os.path.join(PH, fn), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        fatti.add(k); cache["__fatti__"] = sorted(fatti)
        json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
        print(time.strftime("%H:%M:%S"), k, "fatto", flush=True)
    print(f"foto controllate: {tot}, tolte: {tolte}")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
