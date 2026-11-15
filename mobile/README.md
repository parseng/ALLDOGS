# ALLDOGS per telefono (prototipo, opzione A)

L'app è un guscio nativo (Expo, SDK 58, TypeScript) che apre la web app pubblicata
<https://parseng.github.io/ALLDOGS/> a tutto schermo e aggiunge:

- **GPS nativo**: sostituisce `navigator.geolocation` della pagina, e durante una passeggiata
  (`alldogs-nav` nel localStorage) continua a registrare anche a schermo spento (`expo-location` + `expo-task-manager`).
- **Promemoria**: legge dal profilo del cane (`alldogs-dog`) nome, `orariSlots` e `durata` e programma notifiche
  settimanali all'inizio di ogni fascia libera (`expo-notifications`). Toccando la notifica si apre «Crea giro».

La web app non va modificata: il ponte è in `src/bridge.ts` (script iniettato prima che la pagina parta).

## Avvio sul PC

```
cd mobile
npm install
npx expo install --check
npx expo start
```

Poi apri **Expo Go** sull'iPhone e inquadra il QR code.

Limiti di Expo Go: la posizione **in background** e alcune notifiche richiedono una "development build"
(`npx expo run:ios` / EAS Build), che serve comunque per pubblicare sugli store.

## Identità

- Nome: ALLDOGS · bundle id / package: `it.alldogs.app`
- Icone: `assets/` (prese da `icon-512.png` della web app)
