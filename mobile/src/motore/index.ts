// Collega il motore (le regole del sito) al telefono: memoria, GPS, voce, condivisione.
// Le schermate usano `motore()` per leggere i dati e `useMotore()` per ridisegnarsi quando cambiano.
import { useSyncExternalStore } from "react";
import { Alert, Linking, Share, Vibration } from "react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { archivio } from "../archivio";
import { Pos, onPosition, startWatch, stopWatch } from "../location";
import { C } from "../theme";
import { creaAmbiente } from "./ambiente";
import { CORPO } from "./corpo.generated";
import { azzeraMappa, collegaMotore, mapboxFinto, mappaRemota } from "../mappa/remota";
// @ts-ignore: file generato da tools/genera-motore.mjs
import { creaMotore } from "./web.generated";

export const SITO = "https://parseng.github.io/ALLDOGS/";

let M: any = null;
let A: ReturnType<typeof creaAmbiente> | null = null;
let versione = 0;
let generazione = 0;
let inCoda = false;
const iscritti = new Set<() => void>();
const pagine = new Set<(hash: string) => void>();
const avvisi = new Set<(testo: string) => void>();
let supabaseLib: any = null;

const ganci: ((M: any) => void)[] = [];
/** cose da fare ogni volta che il motore viene creato (anche dopo un cambio di cane) */
export const aOgniAvvio = (f: (M: any) => void) => { ganci.push(f); if (M) f(M); };

/** avvisa le schermate che qualcosa è cambiato (più avvisi ravvicinati diventano uno solo) */
export function notifica() {
  if (inCoda) return;
  inCoda = true;
  setTimeout(() => {
    inCoda = false;
    versione++;
    iscritti.forEach((f) => f());
  }, 0);
}
const iscrivi = (f: () => void) => (iscritti.add(f), () => void iscritti.delete(f));
/** fa ridisegnare la schermata quando i dati del motore cambiano */
export function useMotore(): number {
  return useSyncExternalStore(iscrivi, () => versione);
}
export const motore = () => M as any;
export const pagina = () => A!;
export const generazioneMotore = () => generazione;
export const quandoCambiaPagina = (f: (hash: string) => void) => (pagine.add(f), () => void pagine.delete(f));
export const quandoAvvisa = (f: (testo: string) => void) => (avvisi.add(f), () => void avvisi.delete(f));
export const avvisa = (t: string) => avvisi.forEach((f) => f(t));
export const usaSupabase = (lib: any) => (supabaseLib = lib);

// ---- posizione ----
let nSeguiti = 0;
const comeBrowser = (l: Location.LocationObject) => ({
  coords: { latitude: l.coords.latitude, longitude: l.coords.longitude, accuracy: l.coords.accuracy ?? 30, altitude: l.coords.altitude, heading: l.coords.heading != null && l.coords.heading >= 0 ? l.coords.heading : null, speed: l.coords.speed != null && l.coords.speed >= 0 ? l.coords.speed : null },
  timestamp: l.timestamp,
});
async function permesso() {
  const p = await Location.requestForegroundPermissionsAsync();
  if (p.status !== "granted") throw Object.assign(new Error("permesso negato"), { code: 1 });
}
// il GPS è uno solo (src/location.ts): in primo piano e, durante una passeggiata, anche a schermo spento
const ascolti = new Map<number, () => void>();
let ultimoTempo = 0;
const daPos = (p: Pos) => ({ coords: { latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy ?? 30, altitude: p.altitude, heading: p.heading != null && p.heading >= 0 ? p.heading : null, speed: p.speed != null && p.speed >= 0 ? p.speed : null }, timestamp: p.timestamp });
const posizione = {
  una(ok: (p: any) => void, ko: (e: any) => void) {
    (async () => {
      try {
        await permesso();
        const ultima = await Location.getLastKnownPositionAsync({ maxAge: 60000 });
        ok(comeBrowser(ultima || (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }))));
      } catch (e) { if (ko) ko(e); }
    })();
  },
  segui(ok: (p: any) => void, ko: (e: any) => void) {
    const id = ++nSeguiti;
    // la stessa posizione può arrivare due volte (primo piano e sottofondo): la seconda si scarta
    ascolti.set(id, onPosition((p) => { if (p.timestamp <= ultimoTempo) return; ultimoTempo = p.timestamp; ok(daPos(p)); }));
    startWatch().then((si) => { if (!si && ko) ko({ code: 1 }); }).catch((e) => ko && ko(e));
    return id;
  },
  ferma(id: number) {
    const f = ascolti.get(id);
    if (f) f();
    ascolti.delete(id);
    if (!ascolti.size) stopWatch();
  },
};

// le richieste a Mapbox portano l'indirizzo del sito: il token pubblico è limitato a quello
const fetchApp = ((u: any, o?: any) => {
  const url = typeof u === "string" ? u : (u && u.url) || "";
  if (url.includes("api.mapbox.com")) o = Object.assign({}, o, { headers: Object.assign({ Referer: SITO }, o && o.headers) });
  // le funzioni del server (assistente e calcolo dei giri) rispondono solo alle richieste "dal sito"
  if (url.includes(".supabase.co/functions/")) o = Object.assign({}, o, { headers: Object.assign({ Origin: "https://parseng.github.io" }, o && o.headers) });
  return fetch(u, o);
}) as typeof fetch;

// colori che il motore chiede "alla pagina" (verdetti sulla mappa)
const COLORI = { "--ok": "#3E8E41", "--warn": "#D99A1C", "--no": "#D4503C", "--wait": "#8C9486", "--accent": C.forest, "--dog": C.copper, "--line": C.sage2, "--surface": C.cream, "--accent-soft": C.okSoft, "--steep": C.copper };

// funzioni del motore dopo le quali le schermate vanno ridisegnate
const ALTRE = new Set(["setFull", "setScene", "peek", "hidePeek", "end3d", "setStyleKind", "toggleSave", "setNear", "clearGen", "setStart", "drawRoute", "closeAI", "homeExtra", "syncSave", "applyScene", "loadWeather", "loadPhotos", "loadCell", "loadPlaces", "findTrail", "loadNames", "geoSuggest", "refreshView", "startNav", "endNav", "generate", "chatSend", "toRoute", "placeLoop", "setSurf", "mcSend", "syncNow", "miniSend", "miniRender", "miniChat", "openAI", "wzFinish", "accPaint", "sbLoad", "sosSheet", "renderChat", "showGen", "showMan", "showCrea", "autoWhy", "rules"]);

export function avviaMotore() {
  if (M) return M;
  A = creaAmbiente({
    archivio,
    sito: SITO,
    fetch: fetchApp,
    posizione,
    parla: (t: string, o: any) => Speech.speak(t, { language: "it-IT", rate: o.rate || 1 }),
    zitto: () => void Speech.stop(),
    vibra: (p: any) => Vibration.vibrate(p as any),
    condividi: async (d: any) => void (await Share.share({ title: d.title, message: [d.text, d.url].filter(Boolean).join(" ") })),
    copia: async (t: string) => void (await Clipboard.setStringAsync(t)),
    apri: (u: string) => void Linking.openURL(u).catch(() => {}),
    avviso: (t: string) => Alert.alert("AllDogs", t),
    cambioPagina: (h: string) => pagine.forEach((f) => f(h)),
    ricarica: () => setTimeout(riavviaMotore, 0),
    get supabase() { return supabaseLib; },
    colori: COLORI,
    mapboxgl: mapboxFinto,
    corpo: CORPO,
    casuale: (a: any) => { try { return Crypto.getRandomValues(a); } catch { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; } },
  } as any);
  azzeraMappa();
  M = creaMotore(A.amb);
  collegaMotore(M);
  M.setInteractive = (on: boolean) => mappaRemota.manda(["inter", !!on]);
  // gli avvisi brevi del sito diventano gli avvisi dell'app
  M.toast = (t: string) => avvisa(String(t).replace(/<[^>]+>/g, ""));
  // nel sito i nomi finiscono dentro l'HTML e vengono "protetti"; qui il testo è già sicuro
  // ogni volta che il motore "ridisegna" qualcosa, le schermate native si aggiornano
  for (const k of Object.getOwnPropertyNames(M)) {
    if (!/^(render|show|paint)[A-Z]/.test(k) && !ALTRE.has(k)) continue;
    const f = M[k];
    if (typeof f !== "function") continue;
    try {
      M[k] = function (this: any, ...a: any[]) {
        const r = f.apply(this, a);
        notifica();
        if (r && typeof r.then === "function") r.then(notifica, notifica);
        return r;
      };
    } catch {}
  }
  const s = M.store, set = s.set, del = s.del;
  s.set = function (k: string, v: any) { const r = set.call(s, k, v); notifica(); return r; };
  s.del = function (k: string) { del.call(s, k); notifica(); };
  generazione++;
  ganci.forEach((f) => { try { f(M); } catch (e) { console.warn("motore: gancio", e); } });
  return M;
}

/** come "ricarica la pagina" nel sito: serve quando si cambia o si aggiunge un cane */
export function riavviaMotore() {
  const dove = A ? A.hash() : "esplora";
  if (A) A.spegni();
  ascolti.forEach((f) => f());
  ascolti.clear();
  stopWatch();
  M = null;
  avviaMotore();
  if (dove && M.S.dog) A!.vaiA(dove);
  notifica();
  pagine.forEach((f) => f(A!.hash()));
}

/** testo del sito (con qualche segno HTML) → testo semplice */
export function pulito(t: any): string {
  return String(t ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

// per le prove sul PC: motore e pagina invisibile raggiungibili dalla console
if (__DEV__) (globalThis as any).__AD = { motore: () => M, pagina: () => A };
