# AllDogs

App per escursioni e passeggiate pensata **per il cane**, in tutta Italia (sentieri di montagna, giri in città nei 115 capoluoghi, lungomare). Versione alpha.

Si apre da https://parseng.github.io/ALLDOGS/ e si può aggiungere alla schermata Home del telefono.

- **Esplora**: mappa Mapbox, ricerca a tutto schermo in tutta Italia, sentieri con verdetto per il proprio cane. Filtri: cani ammessi, giorno, verdetto, lunghezza (andata e ritorno), dislivello, impegno per il cane, difficoltà CAI, zona, attività e particolarità.
- **Scheda sentiero**: cani ammessi o no (regole dei parchi + OpenStreetMap), lunghezza e salita contando **andata e ritorno** se non è un anello, tempo col cane, ombra tratto per tratto (satellite), acqua, fondo, meteo, cosa portare, recensione con domande per il cane e foto.
- **Crea giro**: automatico, manuale («Lo disegno io»), assistente AI (Gemini). L'anello lo disegna OpenRouteService.
- **Avvia percorso**: GPS dal vivo (anche di corsa), indicazioni passo-passo, avvisi per il cane, foto del sentiero durante il giro, posizione condivisa. Nei percorsi lineari avvisa a fine andata e conta i km del ritorno.
- **Attività**: diario delle uscite con domande veloci a fine giro, percorsi salvati, mappe scaricate per l'offline.
- **Allenati**: obiettivi con calendario e 42 lezioni di addestramento.
- **Pagina del cane**: più cani, salute, libretto, promemoria, pronto soccorso, zaino, regole del posto.

Senza account i dati restano sul telefono; con l'account (Supabase, email e password) si salvano anche nel database, protetti in modo che ognuno veda solo i propri. Le chiavi di OpenRouteService e Gemini stanno solo sul server (funzioni Supabase `ai-chat` e `ors-route`, con limiti d'uso). Il token Mapbox nel codice è quello pubblico (`pk.`).

## Database e funzioni (`supabase/`)

- `supabase/migrations/`: tabelle, regole di accesso (RLS), limiti. Si applicano con `supabase db query --remote=<ref> -f <file>`.
- `supabase/functions/`: `ai-chat` (Gemini) e `ors-route` (OpenRouteService). Deploy: `supabase functions deploy ai-chat ors-route --project-ref <ref> --use-api --no-verify-jwt`.
- Mai nel repo: password del database, chiave `secret`/`service_role`, chiavi Gemini e OpenRouteService.

## Test

Nessuna dipendenza da installare: basta Node 20 o più recente.

| Comando | Cosa prova |
|---|---|
| `npm run test:logica` | Calcoli dell'app: quanta strada può fare il cane, verdetto dei sentieri (distanza, andata e ritorno, salita, difficoltà, caldo), progressi giornalieri, orari liberi, testi resi innocui. Gira anche su GitHub a ogni push. |
| `npm run test:supabase` | Sul progetto vero: regole di accesso con due utenti di prova (poi cancellati), limiti sui testi, funzioni sul server (siti ammessi, richieste non valide o troppo grandi). Serve la variabile `SUPABASE_SECRET_KEY` (chiave `secret` del progetto, solo in memoria): senza, i test sul database vengono saltati. |
| `npm test` | Tutti e due. |

Pagine legali: `privacy.html` e `termini.html` (bozze, da completare con i dati del titolare).

## Dati dei sentieri (`data/`)

Già calcolati, così l'app si apre subito: `data/c/<lat>_<lon>.json` (riquadri da mezzo grado), `data/index.json`, `data/names.json` (ricerca), `data/p/` (luoghi utili). Strumenti in `tools/`:

| Comando | Cosa fa |
|---|---|
| `python tools/build_italy.py fetch` / `build` | Sentieri da OpenStreetMap, dislivelli, fondo |
| `python tools/build_feats.py fetch` / `apply` | Particolarità (fiumi, laghi, cime…) e descrizioni |
| `python tools/build_shade.py apply` | Ombra vera dalla mappa degli alberi ESA WorldCover (serve `pip install rasterio`) |
| `python tools/build_dogs.py fetch` / `apply` | Cani ammessi: regole dei parchi (scritte nel file) + aree protette e cartelli `dog=*` di OpenStreetMap |
| `python tools/build_city.py`, `build_walks.py` | Luoghi utili e giri in città |
| `python tools/build_names.py` | Elenco per la ricerca (da rilanciare dopo ogni modifica dei riquadri) |

Il verdetto è un consiglio prudente, non una garanzia. L'app non sostituisce il veterinario.

Dati: © OpenStreetMap contributors (ODbL) · Mappe e immagini © Mapbox · Alberi e ombra: ESA WorldCover 2021 (CC BY 4.0) · Meteo: Open-Meteo, di riserva MET Norway · Quote e rilievo 3D: Terrain Tiles (Mapzen, AWS Open Data) · Percorsi: OpenRouteService · Chat: Gemini (Google).
