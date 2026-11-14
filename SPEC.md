# AllDogs – specifica della versione 3

Utente: Giuseppe (Napoli), non informatico. Tutti i testi dell'app in italiano semplice.
App: sentieri e passeggiate adatti al PROPRIO cane. Zona iniziale: Napoli/Campania.
Sito: https://parseng.github.io/ALLDOGS/ (GitHub Pages, branch `main`, file statici: `index.html`, `manifest.json`, icone).
La versione 2 attuale è in `index.html` (un solo file, JavaScript semplice, senza build). Mantenere questa semplicità.

## Regole fisse
- Verdetto = consiglio prudente, mai garanzia. Niente consigli veterinari.
- NON copiare dati, foto o testi di AllTrails. Stessa struttura di app (barra in basso, schede), grafica propria.
- Dati sentieri: OpenStreetMap via Overpass (relazioni `route=hiking|foot`), con credito visibile.
- Meteo e quote: Open-Meteo. Giri ad anello: OpenRouteService (`round_trip`).
- Le chiavi segrete (OpenRouteService, Gemini) NON vanno nel codice: l'utente le incolla nell'app (salvate in localStorage). Soluzione provvisoria per i test.
- Token Mapbox pubblico (inizia con `pk.`): lo fornisce Giuseppe. GitHub blocca il push se compare nel codice finché lui non lo autorizza dal link "unblock secret" che GitHub mostra al push.

## Cosa ha chiesto Giuseppe per la versione 3
1. **Mapbox GL JS** al posto di Leaflet in tutte le schermate: stile outdoor, satellite, rilievo 3D.
   Consiglio: una sola istanza di mappa spostata tra le schermate (meno "map loads").
2. **Esplora**: mappa in alto, toccabile e ingrandibile (con pulsante schermo intero); sotto, sezione "Consigliati"
   (sentieri famosi della zona: Sentiero degli Dei, Gran Cono del Vesuvio, Valle delle Ferriere, Monte Faito, Punta Campanella,
   Baia di Ieranto, Monte Nuovo, Lago d'Averno, Astroni, Monte Epomeo, Monte Solaro…) e poi tutti i sentieri.
   Ogni sentiero ha una **miniatura grande** tipo scheda AllTrails: per ora immagine satellitare Mapbox Static Images con il tracciato sopra.
3. **Filtri sotto la ricerca** (oltre a giorno, verdetto, lunghezza, difficoltà CAI, zona):
   - **Attività**: passeggiata facile, escursione, trekking impegnativo, corsa col cane, bagno, giro in città.
   - **Particolarità**: cascate, vista panoramica, laghi, fiumi, bosco, spiaggia, grotte, siti storici, vette, fontanelle, passeggiata in città.
     Ricavate in automatico da OpenStreetMap (elementi vicini al tracciato). Le fontanelle servono anche per la voce "Acqua lungo il percorso".
   - **Dislivello**: fasce (fino a 150 m, 150–400, 400–800, oltre 800).
4. **Crea giro** con tre modi: **Chat** con l'AI (Gemini gratuito: l'AI capisce cosa vuole l'utente, decide durata e preferenze, l'app genera l'anello;
   l'AI propone anche tappe e comandi da dare al cane), **Automatico** (un tocco: posizione + cane + meteo), **Manuale** (segnaposto + durata).
5. **Il mio cane**: aggiungere **patologie** (articolazioni, cuore, respirazione, sovrappeso, epilessia, diabete, convalescenza, altro)
   e **libretto sanitario** (microchip, veterinario, vaccini, antiparassitario, note). Le patologie rendono i limiti più prudenti
   e vengono passate all'AI quando crea i percorsi. Dati salvati solo sul dispositivo. Avviso: l'app non sostituisce il veterinario.

## Già presente nella versione 2 (da conservare)
Onboarding profilo cane, verdetto con motivi, impegno facile/media/difficile, meteo 7 giorni con ore colorate, cosa portare,
passi stimati (utente e cane), salvati, giri salvati, tema chiaro/scuro, manifest per installazione.

## Come provare
Server locale (`python -m http.server` o `npx serve`) e browser: controllare con dati VERI che i sentieri si carichino,
che mappa, miniature, filtri, scheda, meteo funzionino a larghezza telefono (390 px) in chiaro e scuro.

## Aggiunte del 13 novembre 2026 (richieste da Giuseppe)
- **Dati pronti**: `data/trails.json` (sentieri + dislivelli + particolarità) creato da `tools/build_data.py`. L'app non chiama più Overpass né il
  servizio quote all'avvio (prima esauriva il limite giornaliero di Open-Meteo e i verdetti restavano su "Sto valutando"). Overpass resta come riserva se il file manca.
- **Rimuovi percorso**: pulsante sulla mappa (Esplora: toglie il sentiero evidenziato e torna a tutti i sentieri; Crea giro: elimina il giro creato).
- **Avvia percorso** (schermata `#vai`): GPS dal vivo, tempo, km fatti/mancanti, passi stimati, meteo, tappe, avvisi per il cane; "Chiudi attività" salva in Attività
  (`alldogs-acts` in localStorage). Lo schermo deve restare acceso: un sito web non può usare il GPS in background.
- **Andatura personale**: media minuti/km delle passeggiate salvate; sostituisce la media fissa (18 min/km) nelle stime e nel prompt dell'AI.
- **Chat**: modelli Gemini di riserva con tempo massimo di 15 secondi ciascuno (i server gratuiti danno spesso errore 503).

## Idee per dopo
- Limitare il token Mapbox al dominio del sito. Contapassi vero e GPS a schermo spento richiedono un'app installata dallo store.

## Aggiunte del 14 novembre 2026 (richieste da Giuseppe)
- **Manuale → "Lo disegno io"**: segnaposti sulla mappa (trascinabili), uniti seguendo strade e sentieri con OpenRouteService (directions), anello opzionale.
- **Grafico del dislivello** per sentieri (profilo in `data/trails.json`, campo `elev[id].p`) e giri creati (quote di OpenRouteService). In arancione i tratti ripidi per il cane.
- **Fondo colorato** sulla mappa: asfalto o pietra, terra o erba, gradini, non indicato (campo `sf` per i sentieri, extra `surface`/`waytype` di ORS per i giri).
- **Anteprima 3D** del percorso (rilievo + rotazione lenta). **Mappe**: Outdoor, Satellite, Strade, Topografica (OpenTopoMap), Notte; in più ombre del rilievo, radar pioggia (RainViewer), legenda.
- **Foto profilo del cane** (salvata solo sul dispositivo, `alldogs-photo`).
- Grafica e simboli propri: gli screenshot di AllTrails sono stati usati solo come riferimento per le funzioni, senza copiarne mappe, dati o stile.
- **Anteprima 3D = volo**: una freccia percorre il tracciato con la visuale che la segue (pausa, ripeti, chiudi).
- **Impostazioni di navigazione** (ingranaggio in Avvia percorso): indicazioni passo-passo (da OpenRouteService per i giri, dalla forma del tracciato per i sentieri),
  navigazione vocale (sintesi vocale del browser), pausa automatica, schermo acceso. **Avvisi**: fuori percorso/svolta sbagliata, meteo che cambia (ricontrollo ogni 15 minuti).
- **Modifica percorso** sui sentieri pronti: diventano segnaposti nel modo "Lo disegno io".
- **Posizione in tempo reale**: link `#segui-<canale>`; gli aggiornamenti passano da ntfy.sh (canale casuale, 12 ore). Nessun server nostro.
- **Recensioni**: per ora solo locali (`alldogs-reviews`). Per condividerle tra utenti serve un archivio online (da decidere con Giuseppe).
- Mappa: sentieri e gradini più evidenti, più nomi di luoghi, frecce di direzione sul percorso scelto. Dislivello ricalcolato (interpolazione, soglia 3 m).

## Nuova veste (14 novembre 2026, richiesta di Giuseppe)
- Regole grafiche in `DESIGN.md` (libretto di stile): da seguire per ogni schermata nuova.
- Menu in basso: Esplora · Attività (diario + menu a tendina con percorsi salvati e mappe scaricate) · Crea giro · Allenati (Obiettivi e Addestramento) · [nome del cane] (pronto soccorso, salute, zaino, regole, dati, impostazioni). Il menu laterale non c'è più.
- Assistente AI solo dal bottone "Chiedi" (Crea giro, Obiettivi, Addestramento).
- Diario: mappa grande di ogni uscita; toccandola si apre il percorso fatto a tutto schermo (`#u-<ora di inizio>`).
- Icona dell'app: `python tools/make_icon.py`.
- Più cani: tutti in `alldogs-dogs` ({list, cur, walk}); `alldogs-dog` è la copia del cane scelto. Dati per cane (lezioni, obiettivo, salute, foto): primo cane con le chiavi di sempre, gli altri con "-<id>". In Esplora "Chi viene?": con più cani sentieri e giri si giudicano sul più delicato (quello che arriva meno lontano). Ogni uscita del diario salva quali cani c'erano; l'andatura è per cane.
- Pagine vuote con un pulsante per cominciare; avvertenze in una riga in fondo alle pagine.
