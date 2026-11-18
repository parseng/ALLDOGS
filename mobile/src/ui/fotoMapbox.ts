// Meno richieste a Mapbox per le foto dal satellite (ogni foto chiesta a Mapbox consuma crediti):
// 1) una foto si chiede solo quando la sua carta arriva davvero sullo schermo (non per tutte le carte della pagina);
// 2) una volta scaricata resta salvata nel telefono per 30 giorni e non si chiede più.
//    Sul telefono ci pensa expo-image (cache su disco); nel browser la salvo io nella "cache" del sito.
import { useEffect, useState } from "react";
import { Dimensions, Platform } from "react-native";

export const daMapbox = (u: string) => !!u && u.includes("api.mapbox.com");

// ---- 1) visibile sullo schermo? ----
type Voce = { vista: () => any; fatto: () => void };
const inAttesa = new Set<Voce>();
let giro: ReturnType<typeof setInterval> | null = null;
const MARGINE = 250; // carico un po' prima che la carta entri, così la foto è già pronta

function controlla() {
  const { width: W, height: H } = Dimensions.get("window");
  inAttesa.forEach((v) => {
    const n = v.vista();
    if (!n || typeof n.measureInWindow !== "function") return;
    n.measureInWindow((x: number, y: number, w: number, h: number) => {
      // le schermate nascoste hanno misura zero: lì non si carica niente
      if (!w || !h) return;
      if (y < H + MARGINE && y + h > -MARGINE && x < W + MARGINE && x + w > -MARGINE) {
        inAttesa.delete(v);
        v.fatto();
      }
    });
  });
  if (!inAttesa.size && giro) { clearInterval(giro); giro = null; }
}
/** da chiamare quando una pagina scorre: le foto appena entrate si caricano subito */
export function scorrimento() { if (inAttesa.size) controlla(); }

/** diventa true (e resta true) quando la vista entra sullo schermo */
export function useVisibile(vista: () => any, attivo: boolean): boolean {
  const [vis, setVis] = useState(!attivo);
  useEffect(() => {
    if (!attivo || vis) return;
    const v: Voce = { vista, fatto: () => setVis(true) };
    inAttesa.add(v);
    const t = setTimeout(controlla, 60);
    if (!giro) giro = setInterval(controlla, 700);
    return () => { clearTimeout(t); inAttesa.delete(v); };
  }, [attivo, vis]);
  return vis;
}

// ---- 2) cache nel browser (versione web dell'app) ----
const GIORNI = 30, MASSIMO = 400;
const NOME = "ad-mapbox-foto";
const pronte = new Map<string, string>(); // indirizzo Mapbox -> foto già in memoria (blob:)
const web = Platform.OS === "web" && typeof caches !== "undefined";

async function prendi(u: string): Promise<string> {
  const c = await caches.open(NOME);
  const hit = await c.match(u);
  const quando = hit ? Number(hit.headers.get("x-ad-t") || 0) : 0;
  if (hit && Date.now() - quando < GIORNI * 864e5) return URL.createObjectURL(await hit.blob());
  const r = await fetch(u, { mode: "cors", credentials: "omit" });
  if (!r.ok) throw new Error("mapbox " + r.status);
  const b = await r.blob();
  c.put(u, new Response(b, { headers: { "content-type": r.headers.get("content-type") || "image/jpeg", "x-ad-t": String(Date.now()) } }))
    .then(() => pulisci(c)).catch(() => {});
  return URL.createObjectURL(b);
}
let pulendo = false;
async function pulisci(c: Cache) {
  if (pulendo) return;
  pulendo = true;
  try {
    const ks = await c.keys();
    for (const k of ks.slice(0, Math.max(0, ks.length - MASSIMO))) await c.delete(k); // le più vecchie per prime
  } catch {} finally { pulendo = false; }
}

/** nel browser: l'indirizzo da mostrare (la copia salvata, se c'è). Sul telefono: lo stesso indirizzo. */
export function useFotoSalvata(u: string, pronta: boolean): string | null {
  const [s, setS] = useState<string | null>(() => (!web || !daMapbox(u) ? u : pronte.get(u) || null));
  useEffect(() => {
    if (!web || !daMapbox(u)) { setS(u); return; }
    if (pronte.has(u)) { setS(pronte.get(u)!); return; }
    setS(null);
    if (!pronta) return;
    let via = false;
    prendi(u).then((b) => { pronte.set(u, b); if (!via) setS(b); }).catch(() => { if (!via) setS(u); });
    return () => { via = true; };
  }, [u, pronta]);
  return s;
}
