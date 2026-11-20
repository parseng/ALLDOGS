// Passeggiata in corso nella schermata di blocco: una notifica silenziosa (niente suono, niente banner) con tempo e km,
// che si aggiorna mentre cammini e si toglie quando torni nell'app o finisci. Toccandola si torna alla passeggiata.
// (Il riquadro "Live Activity" vero di iPhone richiede un'estensione nativa: arriverà con la versione per l'App Store.)
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { motore } from "./motore";
import { onPosition } from "./location";
import { nav } from "./nav";

const ID = "alldogs-passeggiata";
let ultimo = 0, attivo = false;

function testo() {
  const M = motore(), n = M && M.nav;
  if (!n) return null;
  const km = (n.dist / 1000).toFixed(2).replace(".", ","), t = M.clock(M.navElapsed());
  const lib = n.o && n.o.free, tot = !lib && n.total ? ` di ${M.km(n.total + (n.retC || 0))}` : "";
  return { titolo: n.paused ? "Passeggiata in pausa" : `In cammino con ${(M.dog() && M.dog().name) || "il cane"}`, corpo: `${t} · ${km}${tot} km${n.paused ? " · in pausa" : ""}` };
}

async function mostra() {
  const x = testo();
  if (!x) return togli();
  try {
    if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("in-cammino", { name: "Passeggiata in corso", importance: Notifications.AndroidImportance.LOW, sound: null, vibrationPattern: null });
    await Notifications.scheduleNotificationAsync({
      identifier: ID,
      content: { title: x.titolo, body: x.corpo, sound: false, interruptionLevel: "passive", sticky: true, autoDismiss: false, data: { apri: "vai" } } as any,
      trigger: Platform.OS === "android" ? ({ channelId: "in-cammino" } as any) : null,
    });
    attivo = true; ultimo = Date.now();
  } catch {}
}

async function togli() {
  if (!attivo) return;
  attivo = false;
  try { await Notifications.dismissNotificationAsync(ID); } catch {}
  try { await Notifications.cancelScheduledNotificationAsync(ID); } catch {}
}

// app in sottofondo o schermo bloccato durante una passeggiata: mostro la notifica
AppState.addEventListener("change", (s) => {
  const M = motore();
  if (s === "active") togli();
  else if (M && M.nav) mostra();
});
// mentre cammini con lo schermo bloccato (se il telefono lascia girare l'app) la aggiorno al massimo una volta al minuto
onPosition(() => {
  const M = motore();
  if (AppState.currentState === "active" || !M || !M.nav) return;
  if (Date.now() - ultimo > 60000) mostra();
});
// toccando la notifica si torna alla passeggiata
Notifications.addNotificationResponseReceivedListener((r) => {
  try { if (r.notification.request.identifier === ID && motore() && motore().nav) nav.apri("vai"); } catch {}
});

/** all'inizio di una passeggiata: chiedo (una volta) il permesso per la notifica nella schermata di blocco */
export async function permessoBlocco() {
  try { const p = await Notifications.getPermissionsAsync(); if (!p.granted && p.canAskAgain) await Notifications.requestPermissionsAsync(); } catch {}
}
