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
