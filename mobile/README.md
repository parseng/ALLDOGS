# ALLDOGS per telefono (app nativa, nuovo design)

App Expo (SDK 58, TypeScript) con tutte le schermate native nel nuovo stile (`repo/design/DESIGN-NUOVO.md`).

## Come è fatta

- **Motore** (`src/motore/`): le regole del sito (verdetti, limiti del cane, meteo, programma di allenamento,
  lezioni, giri, navigazione…) sono le **stesse** di `index.html`. `tools/genera-motore.mjs` le copia in
  `web.generated.js` e la struttura della pagina in `corpo.generated.ts`. Il motore gira in una pagina invisibile
  (linkedom): l'app la legge e la ridisegna in modo nativo. Dopo ogni modifica del sito: `node tools/genera-motore.mjs`.
- **Mappa** (`src/mappa/`): la mappa vera del sito (Mapbox GL JS, tutte le mappe, meteo, satellite, 3D, volo)
  dentro un riquadro; il motore la comanda come nel sito (`remota.ts`).
- **Schermate** (`src/schermate/`), mattoni grafici (`src/ui/`), colori e misure (`src/theme.ts`).
- **Mascotte**: WebP animati con sfondo trasparente in `assets/mascotte/` (funzionano su iPhone e Android),
  più le immagini ferme per "Riduci movimento".
- GPS anche a schermo spento durante la passeggiata (`src/location.ts`), promemoria (`src/notifications.ts`),
  foto sul telefono (`src/foto.ts`), account Supabase (stesso del sito).

## Provare

```
cd mobile
npm install
npx expo start
```

Poi apri **Expo Go** e inquadra il QR code. Per il GPS a schermo spento serve una build (EAS Build).

Prove sul PC: `npm test` (regole), `npx expo start --web` poi `node tools/prova-app.mjs <cartella> ...` (schermate).
