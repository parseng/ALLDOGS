# AllDogs

App per escursioni e passeggiate pensata per il cane (zona Napoli/Campania). Versione 3.

Si apre da https://parseng.github.io/ALLDOGS/ e si può aggiungere alla schermata Home del telefono.

- **Esplora**: mappa Mapbox (outdoor, satellite, rilievo 3D, schermo intero), sentieri consigliati e tutti i sentieri di OpenStreetMap con miniatura satellitare e verdetto per il proprio cane. Filtri: giorno, verdetto, lunghezza, dislivello, difficoltà CAI, zona, attività e particolarità (cascate, laghi, fontanelle… ricavate da OpenStreetMap).
- **Scheda sentiero**: lunghezza, dislivello, tempo col cane, particolarità, acqua e ombra stimate, meteo, cosa portare.
- **Crea giro**: chat con l'AI (Gemini), automatico con un tocco, o manuale. L'anello lo disegna OpenRouteService.
- **Avvia percorso**: mappa dal vivo con la posizione GPS, tempo, strada fatta e mancante, passi stimati (persona e cane), meteo e avvisi per il cane (pausa acqua, caldo, limite raggiunto). "Chiudi attività" salva la passeggiata.
- **Attività**: passeggiate fatte e andatura personale del cane (minuti per km), usata per stimare le durate e dall'assistente AI.
- **Il mio cane**: profilo, salute (patologie) e libretto sanitario, salvati solo sul telefono.

Le chiavi di OpenRouteService e Gemini non sono nel codice: si incollano nell'app (sezione Il mio cane). Il token Mapbox nel codice è quello pubblico (`pk.`).

I sentieri, i dislivelli e le particolarità sono in `data/trails.json`, già calcolati (così l'app si apre subito). Per aggiornarli: `python tools/build_data.py`, poi commit del file.

Il verdetto è un consiglio prudente, non una garanzia. L'app non sostituisce il veterinario.

Dati: © OpenStreetMap contributors (ODbL) · Mappe e immagini © Mapbox · Meteo: Open-Meteo · Quote e rilievo 3D: Terrain Tiles (Mapzen, AWS Open Data) · Percorsi: OpenRouteService · Chat: Gemini (Google).
