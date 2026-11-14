# AllDogs, libretto di stile

Regole fisse per la grafica di AllDogs. Valgono per ogni schermata nuova o modificata, da chiunque (persona o Claude). Se una regola non va bene, si cambia qui prima di cambiare il codice.

## L'idea

AllDogs è un'app nata sui sentieri, pensata **per il cane**. Non deve sembrare un modello qualsiasi: i colori vengono dal mondo dei sentieri (pietra, bosco, segnavia) e un colore appartiene solo al cane.

## Colori (token in `index.html`, blocco `:root`)

| Token | Chiaro | Scuro | A cosa serve |
|---|---|---|---|
| `--bg` | `#eef0ec` pietra | `#111613` | sfondo delle pagine |
| `--surface` | `#fbfcfa` | `#1a211d` | riquadri, campi, barra in basso |
| `--ink` | `#18201c` | `#e8ede9` | testo |
| `--muted` | `#5a6660` | `#9aa79f` | testo secondario |
| `--line` | `#d8ddd6` | `#2c3630` | bordi e righe |
| `--accent` | `#1d4f3c` verde bosco | `#86c9a6` | azioni principali (Avvia, Salva, Crea il calendario), scheda attiva, icone |
| `--dog` | `#d9531a` arancio segnavia | `#ff8a55` | **solo le cose del cane**: il suo nome e la sua foto nella barra, il pulsante Crea giro, il bottone Chiedi, i tempi e l'impegno calcolati per lui, il riquadro "Per Gohan", il percorso sulla mappa, i tratti ripidi nel grafico |
| `--ok` / `--warn` / `--no` | verde, ocra, rosso | | i tre verdetti (fattibile, con prudenza, sconsigliato) e le ore del meteo |

Regole:
- Ogni colore ha un compito solo. Non usare `--dog` per decorare: se è arancio, parla del cane.
- I verdetti hanno **sempre** la loro icona (✓, !, ✕ disegnati con la maschera CSS), così si capiscono anche senza distinguere i colori.
- Niente colori scritti a mano nei componenti: usare i token. Fanno eccezione i colori della mappa (acqua, aree cani, veterinari), che hanno la loro legenda.
- Il tema scuro usa gli stessi token: ogni token nuovo va definito in tutti e due i blocchi.

## Caratteri

- **Titoli e numeri importanti**: Newsreader (500, 600, 700), con le grazie, elegante come una rivista.
- **Testo**: Albert Sans (400-700), pulito e moderno.
- Niente etichette TUTTE MAIUSCOLE. Niente una parola sola colorata dentro un titolo.
- Grandezze: titolo pagina 32 px, sezione 23 px, scheda 20 px, testo 17 px, scritte piccole 14-15 px (mai sotto 13 px). Non inventarne altre.

## L'elemento firma: il cartello segnavia

Sulle schede dei sentieri la durata calcolata per il cane sta in un cartellino arancio a forma di freccia (`.sign`), come i cartelli veri che indicano le ore di cammino: "1 h 5 min con Gohan". È l'unico elemento decorativo: non aggiungerne altri.

## Forme

- Angoli: 8 px (etichette, verdetti), 12-15 px (pulsanti, campi, icone degli strumenti), 16 px (riquadri e schede, `--r`), tondo pieno solo per avatar, chip e bottoni rotondi della mappa.
- Niente ombre sui riquadri: i bordi `--line` bastano. L'ombra resta solo su cose che galleggiano (bottone Chiedi, finestre dal basso, controlli della mappa).
- Icone: solo quelle disegnate nel blocco `<svg><defs>` in cima alla pagina (`#i-...`), tratto 2. Niente emoji né simboli di testo al posto delle icone.

## Come sono fatte le pagine

- **Menu in basso**: Esplora · Attività · Crea giro · Allenati · [nome del cane]. Niente menu nascosti.
- **Pagina del cane**: in cima Pronto soccorso ed Emergenza; poi salute, zaino, regole; i dati del cane e le impostazioni in riquadri che si aprono.
- **Pagine lunghe** (Obiettivi, Addestramento): resta aperta solo la cosa principale; il resto va in riquadri apri/chiudi (`fold(...)` / `.fold`).
- **Assistente AI**: solo dal bottone "Chiedi" in basso a destra (Crea giro, Obiettivi, Addestramento). Mai chat in fondo alle pagine.
- **Scheda del sentiero**: contiene tutte le informazioni. In basso solo "Avvia percorso" e "Portami lì"; gli strumenti stanno nella fila di icone (`.tools`).
- **Mappa a tutto schermo del sentiero**: in basso una scheda con nome (toccandolo si torna alla scheda), km, salita, discesa, tempo con il cane in arancio, grafico del dislivello, e i pulsanti Scarica e Avvia percorso.
- **In cammino, la mappa**: schermata sempre scura (token del tema scuro), mappa a tutto schermo da navigazione notturna con i palazzi in 3D, inclinata e che gira con la direzione di marcia; freccia blu per la posizione; in alto la prossima svolta e i messaggi in riquadri galleggianti; a sinistra la bussola (tocco: nord in alto o mappa che gira), a destra mappe e centra.
- **In cammino**: in basso solo tempo e km, grandi (numeri fino a 56 px, gli unici oltre le grandezze sopra). Toccandoli si apre il resto: sei numeri (tempo, distanza, mancano, andatura, velocità, passi del cane), meteo, grafico del dislivello con il punto dove siete, SOS e i pulsanti Pausa e Chiudi attività.
- **Tendine dal basso**: si alzano e si abbassano trascinandole o toccando la lineetta in alto; le finestre lunghe scorrono e hanno sempre la X in alto a destra. Le impostazioni si aprono con i tre puntini.
- **Meteo**: riquadro con icona, gradi percepiti, giudizio per il cane e la striscia delle ore buone (verde, ocra, rosso); i dettagli si aprono toccandolo.

## Testi

- Italiano semplice, frasi brevi, dal punto di vista di chi usa l'app.
- I pulsanti dicono cosa succede ("Crea il calendario", non "Invia").
- Una pagina vuota dice cosa fare per riempirla.
- Le avvertenze ("non sostituisce il veterinario") vanno dove servono, in una riga, non ripetute ovunque.
