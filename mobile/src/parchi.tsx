// Parchi e riserve: tocchi un parco e vedi il parco evidenziato sulla mappa e solo i suoi sentieri.
// I dati (forma del parco e sentieri dentro) stanno in data/parks.json, creato da tools/build_parks.py.
import { aOgniAvvio, motore, notifica } from "./motore";
import { mappaRemota } from "./mappa/remota";

export type Parco = { id: number; n: string; k: "nazionale" | "regionale" | "parco" | "riserva"; km2: number; bb: number[]; c: number[]; s: number[]; cl: string[]; g: number[][][] };

let PARCHI: Parco[] = [];
let caricati: Promise<Parco[]> | null = null;
let attivo: Parco | null = null;
let ids = new Set<number>();

export const parcoAttivo = () => attivo;
export const elencoParchi = () => PARCHI;

export function caricaParchi(): Promise<Parco[]> {
  if (!caricati) {
    caricati = motore().getJSON("data/parks.json?v=" + Date.now().toString().slice(0, 7))
      .then((d: any) => { PARCHI = (d && d.parks) || []; notifica(); return PARCHI; })
      .catch(() => { caricati = null; return []; });
  }
  return caricati!;
}

export const TIPO_PARCO: Record<string, string> = { nazionale: "Parco nazionale", regionale: "Parco regionale", parco: "Area protetta", riserva: "Riserva naturale" };

/** i parchi più vicini a un punto, entro r km */
export function parchiVicini(c: number[], r = 70, n = 8): Parco[] {
  const M = motore();
  return PARCHI.map((p) => ({ p, d: M.hav(c, p.c) })).filter((x) => x.d < r * 1000).sort((a, b) => a.d - b.d).slice(0, n).map((x) => x.p);
}

/** una foto vera di un sentiero del parco, se c'è già (le foto arrivano con i sentieri della zona) */
export function fotoParco(p: Parco): string | null {
  const M = motore();
  for (const id of p.s) { const f = M.PH && M.PH[id]; if (f && f[0] && f[0].u) return f[0].u; }
  return null;
}

/** parchi che si chiamano come quello che scrivi nella ricerca */
export function cercaParchi(q: string): Parco[] {
  const M = motore(), nq = M.norm(q);
  if (nq.length < 3) return [];
  const parole = nq.split(" ").filter((w: string) => w.length >= 3 && !["parco", "del", "della", "dei", "regionale", "nazionale", "riserva", "naturale"].includes(w));
  if (!parole.length) return [];
  return PARCHI.filter((p) => { const pn = " " + M.norm(p.n); return parole.every((w: string) => pn.includes(" " + w) || pn.includes(w)); }).slice(0, 5);
}

function disegna() {
  const ID = "ad-parco";
  if (!attivo) {
    mappaRemota.manda(["unlayer", ID + "-l"]); mappaRemota.manda(["unlayer", ID + "-f"]); mappaRemota.manda(["unsource", ID]);
    return;
  }
  const data = { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "MultiPolygon", coordinates: attivo.g.map((r) => [r.map((p) => [p[1], p[0]])]) } }] };
  mappaRemota.manda(["source", ID, { type: "geojson", data }]);
  mappaRemota.manda(["data", ID, data]);
  mappaRemota.manda(["layer", { id: ID + "-f", type: "fill", source: ID, paint: { "fill-color": "#DDF06A", "fill-opacity": 0.22 } }, "ad-trails-hit"]);
  mappaRemota.manda(["layer", { id: ID + "-l", type: "line", source: ID, paint: { "line-color": "#2F4A2B", "line-width": 2.5, "line-dasharray": [2, 1.5] } }, "ad-trails-hit"]);
}

/** apre un parco: mappa sul parco, sentieri solo di quel parco */
export function apriParco(p: Parco) {
  const M = motore();
  attivo = p; ids = new Set(p.s);
  try { M.S.near = null; } catch {}
  Promise.all((p.cl || []).map((k) => { try { return M.loadCell(k); } catch { return null; } })).then(() => { try { M.renderList(); } catch {} notifica(); });
  try { M.goPlace(p.c, 11, [p.bb[1], p.bb[0], p.bb[3], p.bb[2]]); } catch {} // [ovest, sud, est, nord] come Mapbox
  disegna();
  setTimeout(() => { try { M.S.limit = 20; M.renderList(); } catch {} notifica(); }, 600);
}

export function chiudiParco() {
  attivo = null; ids = new Set();
  disegna();
  try { motore().renderList(); } catch {}
  notifica();
}

aOgniAvvio((M: any) => {
  attivo = null; ids = new Set(); caricati = null;
  // con un parco aperto: tutti i sentieri del parco, anche fuori dalla parte di mappa inquadrata
  const filtrati = M.filtered;
  M.filtered = () => {
    if (!attivo) return filtrati();
    const w = M.S.wide;
    M.S.wide = { c: attivo.c, r: 400 };
    try { return filtrati().filter((r: any) => ids.has(r.tr.id)); } finally { M.S.wide = w; }
  };
  // la forma del parco va ridisegnata quando la mappa cambia stile o pagina
  const vista = M.refreshView;
  if (typeof vista === "function") M.refreshView = (...a: any[]) => { const r = vista(...a); if (attivo) disegna(); return r; };
  setTimeout(() => { caricaParchi(); }, 2500);
});
