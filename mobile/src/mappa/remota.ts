// "Mappa a distanza": il motore crede di parlare con Mapbox GL JS come nel sito; in realtà ogni comando
// viene spedito alla pagina della mappa che si vede in quel momento (pagina.ts), e tocchi e spostamenti tornano indietro.
// Così tutta la logica della mappa del sito (sentieri colorati, luoghi, segnaposti, navigazione…) resta la stessa.

type Vista = { c: [number, number]; z: number; b: [[number, number], [number, number]]; bearing: number; pitch: number; user?: boolean };
export type Bersaglio = { id: number; manda: (cmds: any[]) => void };

const st = {
  bersaglio: null as Bersaglio | null,
  coda: [] as any[],
  inCoda: false,
  vista: { c: [41.9, 12.5], z: 5, b: [[36, 6], [47, 19]], bearing: 0, pitch: 0 } as Vista,
  strati: new Set<string>(),
  fonti: new Map<string, any>(),
  ascolti: {} as Record<string, { layer?: string; fn: Function }[]>,
  segnaposti: new Map<number, Segnaposto>(),
  ultimoTocco: [] as any[],
  mappa: null as any,
  motore: null as any,
  stileSpedito: "",
  nMk: 0,
  ultimaCam: null as any[] | null,
  camDopoCambio: false,
  daRipetere: null as any[] | null,
};

function manda(c: any[]) {
  st.coda.push(c);
  if (st.inCoda) return;
  st.inCoda = true;
  setTimeout(() => {
    st.inCoda = false;
    const q = st.coda;
    st.coda = [];
    if (st.bersaglio && q.length) st.bersaglio.manda(q);
  }, 0);
}
const lancia = (ev: string, e?: any) => (st.ascolti[ev] || []).slice().forEach((h) => { if (!h.layer) { try { h.fn(e || {}); } catch (x) { console.warn("mappa:", ev, x); } } });

function serializza(el: any) {
  const css: Record<string, string> = {};
  for (const k of ["cursor", "borderColor", "backgroundImage", "color"]) if (el && el.style && el.style[k]) css[k] = el.style[k];
  return { cls: (el && el.className) || "", html: (el && el.innerHTML) || "", text: el && el.innerHTML ? null : (el && el.textContent) || "", css, click: !!(el && typeof el.onclick === "function") };
}
const ICONA_CANE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7.2 6.6C5.4 4.6 2.6 4.9 2.6 8c0 2.3 1.3 4.6 3.2 5.2"/><path d="M16.8 6.6c1.8-2 4.6-1.7 4.6 1.4 0 2.3-1.3 4.6-3.2 5.2"/><path d="M6 10c0-3.1 2.7-4.9 6-4.9s6 1.8 6 4.9v3.6c0 3.6-2.7 6.4-6 6.4s-6-2.8-6-6.4z"/><circle cx="9.6" cy="11.2" r=".95" fill="currentColor" stroke="none"/><circle cx="14.4" cy="11.2" r=".95" fill="currentColor" stroke="none"/><path d="M10.7 14.4h2.6L12 15.9z" fill="currentColor"/><path d="M12 15.9v1.3"/></svg>`;

class Segnaposto {
  id = ++st.nMk; el: any; opz: any; ll: [number, number] = [0, 0]; rot: number | null = null; sopra = false;
  ascolti: Record<string, Function[]> = {};
  constructor(o: any) { this.opz = o || {}; this.el = this.opz.element; }
  dati() {
    const s = serializza(this.el);
    if (s.html) s.html = s.html.replace(/<svg><use href="#i-dogface"\/><\/svg>/g, ICONA_CANE);
    return { ...s, draggable: !!this.opz.draggable, anchor: this.opz.anchor, rotAlign: this.opz.rotationAlignment, pitchAlign: this.opz.pitchAlignment, rot: this.rot };
  }
  setLngLat(p: any) { this.ll = Array.isArray(p) ? [p[0], p[1]] : [p.lng, p.lat]; if (this.sopra) manda(["mk~", this.id, this.ll, null]); return this; }
  setRotation(r: number) { this.rot = r; if (this.sopra) manda(["mk~", this.id, null, r]); return this; }
  addTo() { this.sopra = true; st.segnaposti.set(this.id, this); manda(["mk+", this.id, this.dati(), this.ll]); return this; }
  remove() { if (this.sopra) manda(["mk-", this.id]); this.sopra = false; st.segnaposti.delete(this.id); return this; }
  on(ev: string, fn: Function) { (this.ascolti[ev] = this.ascolti[ev] || []).push(fn); return this; }
  getLngLat() { return { lng: this.ll[0], lat: this.ll[1] }; }
  getElement() { return this.el; }
}

class MappaRemota {
  constructor(o: any) {
    st.mappa = this;
    if (o && o.center) { st.vista.c = [o.center[1], o.center[0]]; st.vista.z = o.zoom || st.vista.z; }
  }
  // ---- ascolto ----
  on(ev: string, a: any, b?: any) { (st.ascolti[ev] = st.ascolti[ev] || []).push(b ? { layer: a, fn: b } : { fn: a }); return this; }
  once(ev: string, fn: Function) { if (ev === "load" && st.stileSpedito) setTimeout(() => fn({}), 0); else this.on(ev, fn); return this; }
  addControl() { return this; }
  // ---- vista (specchio di quella vera) ----
  getZoom() { return st.vista.z; }
  getBearing() { return st.vista.bearing; }
  getPitch() { return st.vista.pitch; }
  getCenter() { return { lat: st.vista.c[0], lng: st.vista.c[1] }; }
  getBounds() { const b = st.vista.b; return { getSouth: () => b[0][0], getWest: () => b[0][1], getNorth: () => b[1][0], getEast: () => b[1][1] }; }
  getCanvas() { return { style: {} }; }
  getStyle() { return { layers: [] }; }
  // ---- movimenti ----
  jumpTo(o: any) { this._vista(o); this._cam(["m", "jumpTo", [o]]); return this; }
  easeTo(o: any) { this._vista(o); this._cam(["m", "easeTo", [o]]); return this; }
  flyTo(o: any) { this._vista(o); this._cam(["m", "flyTo", [o]]); return this; }
  fitBounds(b: any, o: any) { this._cam(["m", "fitBounds", [b, o || {}]]); return this; }
  // l'ultima inquadratura chiesta si ricorda: se la mappa della schermata non era ancora pronta, la riceve appena lo è
  _cam(c: any[]) { st.ultimaCam = c; st.camDopoCambio = true; manda(c); }
  resize() { manda(["resize"]); return this; }
  _vista(o: any) { if (o.center) st.vista.c = [o.center[1], o.center[0]]; if (o.zoom != null) st.vista.z = o.zoom; if (o.bearing != null) st.vista.bearing = o.bearing; if (o.pitch != null) st.vista.pitch = o.pitch; }
  // ---- stile, livelli, dati ----
  setStyle(s: any) {
    const S = st.motore && st.motore.STYLES;
    const k = (S && Object.keys(S).find((x) => S[x] === s)) || "map";
    st.strati.clear(); st.fonti.clear(); st.stileSpedito = k;
    manda(["style", k]);
    return this;
  }
  addSource(id: string, def: any) { if (st.fonti.has(id)) return this; st.fonti.set(id, this._fonte(id)); manda(["source", id, def]); return this; }
  _fonte(id: string) { return { _ovk: undefined as any, setData: (d: any) => manda(["data", id, d]), updateImage: () => {} }; }
  getSource(id: string) { return st.fonti.get(id) || (id === "composite" && st.stileSpedito !== "topo" && st.stileSpedito !== "s2" ? {} : undefined); }
  removeSource(id: string) { st.fonti.delete(id); manda(["unsource", id]); return this; }
  addLayer(l: any, prima?: string) { if (st.strati.has(l.id)) return this; st.strati.add(l.id); manda(["layer", l, prima]); return this; }
  getLayer(id: string) { return st.strati.has(id) ? { id } : undefined; }
  removeLayer(id: string) { st.strati.delete(id); manda(["unlayer", id]); return this; }
  setPaintProperty(id: string, k: string, v: any) { manda(["paint", id, k, v]); return this; }
  setLayoutProperty(id: string, k: string, v: any) { manda(["layout", id, k, v]); return this; }
  getLayoutProperty() { return undefined; }
  setLayerZoomRange() { return this; }
  setFilter() { return this; }
  setTerrain(t: any) { manda(["terrain", t]); return this; }
  setFog() { return this; }
  hasImage() { return true; }
  addImage() { return this; }
  queryRenderedFeatures(_g: any, o: any) { const L = (o && o.layers) || []; return st.ultimoTocco.filter((f) => !L.length || L.includes(f.layer)); }
  querySourceFeatures() { return []; }
}

export const mapboxFinto = {
  Map: MappaRemota,
  Marker: Segnaposto,
  AttributionControl: class {},
  accessToken: "",
};

/** da chiamare PRIMA di creare (o ricreare) il motore */
export function azzeraMappa() {
  st.ascolti = {};
  st.strati.clear(); st.fonti.clear(); st.segnaposti.clear();
  st.mappa = null; st.stileSpedito = ""; st.motore = null; st.coda = [];
  if (st.bersaglio) st.bersaglio.manda([["mkclear"]]);
}

/** da chiamare dopo aver creato il motore */
export function collegaMotore(M: any) {
  st.motore = M;
  // queste parti nel sito lavorano sulla pagina: qui le fa la pagina della mappa da sola
  for (const n of ["itLabels", "fixSatellite", "detailMap", "kmScale", "gridLoad", "gridMoved", "ovLegend", "syncLayersMenu", "syncFullBtn", "sizeSels"]) { try { M[n] = () => {}; } catch {} }
  M.overlays = () => { manda(["ov", { wxOv: M.wxOv, hillOn: M.hillOn }]); };
  M.meDir = () => {
    const me = M.meM, nav = M.nav;
    if (!me) return;
    manda(["mkdir", me.id, M.scene && M.scene.mode === "nav" && nav && nav.hd != null ? nav.hd : null]);
  };
}

export const mappaRemota = {
  vista: () => st.vista,
  bersaglio: () => st.bersaglio,
  /** una mappa è diventata quella visibile: da qui in poi riceve i comandi del motore */
  attiva(b: Bersaglio) {
    if (st.bersaglio && st.bersaglio.id === b.id) return;
    if (st.bersaglio) st.bersaglio.manda([["mkclear"]]);
    st.bersaglio = b;
    st.coda = [];
    st.daRipetere = st.camDopoCambio ? st.ultimaCam : null;
    st.strati.clear(); st.fonti.clear();
    const M = st.motore;
    if (!M) return;
    try { M.styleOK = false; M.dataSig = {}; } catch {}
    const k = M.wantStyle ? M.wantStyle() : "map";
    try { M.styleNow = k; } catch {}
    st.stileSpedito = k;
    manda(["style", k]); // la pagina risponde "style" e il motore rimanda livelli e dati
  },
  /** si sta cambiando schermata: da qui i comandi aspettano la mappa della schermata nuova */
  stacca(tieniInquadratura = false) { st.bersaglio = null; st.coda = []; if (!tieniInquadratura) st.camDopoCambio = false; },
  disattiva(id: number) { if (st.bersaglio && st.bersaglio.id === id) { st.bersaglio = null; st.camDopoCambio = false; } },
  manda,
  /** messaggi che arrivano dalla pagina della mappa */
  daPagina(id: number, m: any) {
    if (!st.bersaglio || st.bersaglio.id !== id) return;
    if (m.v) st.vista = m.v;
    const M = st.motore;
    switch (m.t) {
      case "style":
        st.strati.clear(); st.fonti.clear();
        st.fonti.set("dem", st.mappa ? st.mappa._fonte("dem") : {});
        st.stileSpedito = m.k;
        // i segnaposti ancora vivi (posizione, partenza del giro) tornano sulla mappa
        st.segnaposti.forEach((s) => manda(["mk+", s.id, s.dati(), s.ll]));
        st.ultimaCam = null;
        lancia("style.load");
        lancia("load");
        st.ascolti.load = [];
        if (st.daRipetere && !st.ultimaCam) manda(st.daRipetere);
        st.daRipetere = null;
        break;
      case "ev": lancia(m.n, { originalEvent: m.v && m.v.user ? {} : undefined }); break;
      case "click": {
        st.ultimoTocco = m.feats || [];
        const e = { lngLat: m.lngLat, point: m.point, originalEvent: {}, features: st.ultimoTocco };
        let preso = false;
        for (const h of (st.ascolti.click || []).slice()) {
          if (!h.layer) continue;
          const f = st.ultimoTocco.filter((x) => x.layer === h.layer);
          if (f.length) { preso = true; try { h.fn({ ...e, features: f }); } catch (x) { console.warn("mappa:", x); } }
        }
        if (!preso || !st.ultimoTocco.some((f) => /^(far-|ad-wt)/.test(f.layer))) lancia("click", e);
        break;
      }
      case "mk": {
        const s = st.segnaposti.get(m.id);
        if (!s) break;
        if (m.lngLat) s.ll = [m.lngLat.lng, m.lngLat.lat];
        if (m.n === "click") { if (s.el && typeof s.el.onclick === "function") s.el.onclick({ stopPropagation() {}, preventDefault() {} }); }
        else (s.ascolti[m.n] || []).slice().forEach((f) => { try { f(); } catch (x) { console.warn("mappa:", x); } });
        break;
      }
      case "ov": if (M) { try { M.wxOv = m.wxOv; M.hillOn = m.hillOn; } catch {} } break;
    }
  },
};
