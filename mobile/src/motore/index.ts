// Collega il motore (le regole del sito) al telefono: memoria, GPS, voce, condivisione.
// Le schermate usano `motore()` per leggere i dati e `useMotore()` per ridisegnarsi quando cambiano.
import { useSyncExternalStore } from "react";
import { Alert, Linking, Share, Vibration } from "react-native";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import * as Clipboard from "expo-clipboard";
import { archivio } from "../archivio";
import { C } from "../theme";
import { creaAmbiente } from "./ambiente";
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
const seguiti = new Map<number, Location.LocationSubscription | null>();
let nSeguiti = 0;
const comeBrowser = (l: Location.LocationObject) => ({
  coords: { latitude: l.coords.latitude, longitude: l.coords.longitude, accuracy: l.coords.accuracy ?? 30, altitude: l.coords.altitude, heading: l.coords.heading != null && l.coords.heading >= 0 ? l.coords.heading : null, speed: l.coords.speed != null && l.coords.speed >= 0 ? l.coords.speed : null },
  timestamp: l.timestamp,
});
async function permesso() {
  const p = await Location.requestForegroundPermissionsAsync();
  if (p.status !== "granted") throw Object.assign(new Error("permesso negato"), { code: 1 });
}
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
    seguiti.set(id, null);
    (async () => {
      try {
        await permesso();
        const s = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 1 }, (l) => ok(comeBrowser(l)));
        if (seguiti.has(id)) seguiti.set(id, s);
        else s.remove();
      } catch (e) { if (ko) ko(e); }
    })();
    return id;
  },
  ferma(id: number) {
    const s = seguiti.get(id);
    if (s) s.remove();
    seguiti.delete(id);
  },
};

// le richieste a Mapbox portano l'indirizzo del sito: il token pubblico è limitato a quello
const fetchApp = ((u: any, o?: any) => {
  const url = typeof u === "string" ? u : (u && u.url) || "";
  if (url.includes("api.mapbox.com")) o = Object.assign({}, o, { headers: Object.assign({ Referer: SITO }, o && o.headers) });
  return fetch(u, o);
}) as typeof fetch;

// colori che il motore chiede "alla pagina" (verdetti sulla mappa)
const COLORI = { "--ok": "#3E8E41", "--warn": "#D99A1C", "--no": "#D4503C", "--wait": "#8C9486", "--accent": C.forest, "--dog": C.copper, "--line": C.sage2, "--surface": C.cream, "--accent-soft": C.okSoft, "--steep": C.copper };

export function avviaMotore() {
  if (M) return M;
  A = creaAmbiente({
    archivio,
    sito: SITO,
    fetch: fetchApp,
    posizione,
    parla: (t, o) => Speech.speak(t, { language: "it-IT", rate: o.rate || 1 }),
    zitto: () => void Speech.stop(),
    vibra: (p) => Vibration.vibrate(p as any),
    condividi: async (d) => void (await Share.share({ title: d.title, message: [d.text, d.url].filter(Boolean).join(" ") })),
    copia: async (t) => void (await Clipboard.setStringAsync(t)),
    apri: (u) => void Linking.openURL(u).catch(() => {}),
    avviso: (t) => Alert.alert("AllDogs", t),
    cambioPagina: (h) => pagine.forEach((f) => f(h)),
    ricarica: () => setTimeout(riavviaMotore, 0),
    get supabase() { return supabaseLib; },
    colori: COLORI,
  } as any);
  M = creaMotore(A.amb);
  // gli avvisi brevi del sito diventano gli avvisi dell'app
  M.toast = (t: string) => avvisa(String(t).replace(/<[^>]+>/g, ""));
  // nel sito i nomi finiscono dentro l'HTML e vengono "protetti"; qui il testo è già sicuro
  // ogni volta che il motore "ridisegna" qualcosa, le schermate native si aggiornano
  for (const k of Object.getOwnPropertyNames(M)) {
    if (!/^(render|show|paint)[A-Z]/.test(k)) continue;
    const f = M[k];
    if (typeof f !== "function") continue;
    try {
      M[k] = function (this: any, ...a: any[]) {
        const r = f.apply(this, a);
        notifica();
        return r;
      };
    } catch {}
  }
  const s = M.store, set = s.set, del = s.del;
  s.set = function (k: string, v: any) { const r = set.call(s, k, v); notifica(); return r; };
  s.del = function (k: string) { del.call(s, k); notifica(); };
  generazione++;
  return M;
}

/** come "ricarica la pagina" nel sito: serve quando si cambia o si aggiunge un cane */
export function riavviaMotore() {
  const dove = A ? A.hash() : "esplora";
  if (A) A.spegni();
  seguiti.forEach((s) => s && s.remove());
  seguiti.clear();
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
