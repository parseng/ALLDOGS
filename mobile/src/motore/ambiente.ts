// "Browser finto" per il motore: le regole del sito sono scritte per una pagina web, qui ricevono
// una pagina che non disegna niente. Le schermate vere sono native: il motore fa solo i conti.
// Questo file non dipende dal telefono (così si può provare anche con i test sul PC).
import { creaDom } from "./dom";

export type Servizi = {
  archivio: { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void; clear(): void; key(i: number): string | null; readonly length: number };
  sito: string; // indirizzo del sito, per i dati dei sentieri (data/...)
  fetch: typeof fetch;
  posizione?: {
    una(ok: (p: any) => void, ko: (e: any) => void, opz?: any): void;
    segui(ok: (p: any) => void, ko: (e: any) => void, opz?: any): number;
    ferma(id: number): void;
  };
  parla?: (testo: string, opz: { rate?: number }) => void;
  zitto?: () => void;
  vibra?: (ms: number | number[]) => void;
  condividi?: (d: { title?: string; text?: string; url?: string }) => Promise<void>;
  copia?: (testo: string) => Promise<void>;
  apri?: (url: string) => void;
  avviso?: (testo: string) => void;
  conferma?: (testo: string) => boolean;
  cambioPagina?: (hash: string) => void;
  ricarica?: () => void;
  supabase?: { createClient: (...a: any[]) => any };
  mapboxgl?: any;
  casuale?: (a: any) => any;
  corpo?: string;
  colori?: Record<string, string>;
  online?: () => boolean;
};

// oggetto "tuttofare": qualsiasi proprietà o chiamata restituisce di nuovo lui
function tuttofare(): any {
  const fn: any = function () {
    return p;
  };
  const p: any = new Proxy(fn, {
    get(t, k) {
      // regola dei Proxy: le proprietà fisse dell'oggetto vanno restituite come sono (Hermes lo controlla)
      const fissa = Object.getOwnPropertyDescriptor(t, k);
      if (fissa && !fissa.configurable) return (t as any)[k];
      if (k === Symbol.toPrimitive) return () => "";
      if (k === Symbol.iterator) return function* () {};
      if (k === "then") return undefined;
      if (k === "length") return 0;
      if (k in t && typeof t[k] !== "function") return t[k];
      return p;
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    },
    apply() {
      return p;
    },
    construct() {
      return p;
    },
  });
  return p;
}

const VALORI_INIZIALI: Record<string, string> = {
  "f-dog": "all", "f-fit": "all", "f-type": "all", "f-eff": "all", "f-len": "all", "f-up": "all", "f-dif": "all", "f-zone": "all", "f-day": "0",
};
const DATI = new Set(["value", "hidden", "checked", "disabled", "open", "innerHTML", "textContent", "innerText", "className", "id", "src", "href", "title", "readOnly", "onclick", "onchange", "oninput", "onsubmit", "onload", "onerror", "width", "height", "scrollTop", "selectedIndex", "max", "min", "placeholder", "type", "name"]);

export function creaElemento(id?: string): any {
  const t: any = {
    id: id || "", value: (id && VALORI_INIZIALI[id]) || "", hidden: false, checked: false, disabled: false, open: false,
    innerHTML: "", textContent: "", className: "", scrollTop: 0, selectedIndex: 0, files: [], children: [], childNodes: [],
    parentNode: tuttofare(), parentElement: tuttofare(), firstChild: null, offsetHeight: 0, offsetWidth: 0, clientHeight: 0, clientWidth: 0, scrollHeight: 0,
    style: { setProperty(k: string, v: string) { (this as any)[k] = v; }, removeProperty(k: string) { delete (this as any)[k]; }, getPropertyValue(k: string) { return (this as any)[k] || ""; } }, dataset: {}, _ev: {} as Record<string, Function[]>, _attr: {} as Record<string, string>, _cl: new Set<string>(),
  };
  const evento = (type: string, extra?: any) => Object.assign({ type, target: el, currentTarget: el, preventDefault() {}, stopPropagation() {} }, extra);
  const metodi: Record<string, Function> = {
    addEventListener: (ev: string, fn: Function) => void (t._ev[ev] = t._ev[ev] || []).push(fn),
    removeEventListener: (ev: string, fn: Function) => void (t._ev[ev] = (t._ev[ev] || []).filter((f: Function) => f !== fn)),
    dispatchEvent: (e: any) => {
      const ev = evento(e && e.type, e);
      (t._ev[ev.type] || []).slice().forEach((f: Function) => f(ev));
      const h = t["on" + ev.type];
      if (typeof h === "function") h(ev);
      return true;
    },
    click: () => {
      const ev = evento("click");
      if (typeof t.onclick === "function") t.onclick(ev);
      (t._ev.click || []).slice().forEach((f: Function) => f(ev));
    },
    querySelectorAll: () => [],
    querySelector: () => creaElemento(),
    closest: () => null,
    contains: () => false,
    getAttribute: (n: string) => (n in t._attr ? t._attr[n] : null),
    setAttribute: (n: string, v: any) => void (t._attr[n] = String(v)),
    removeAttribute: (n: string) => void delete t._attr[n],
    hasAttribute: (n: string) => n in t._attr,
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 }),
    getContext: () => tuttofare(),
    toDataURL: () => "",
    cloneNode: () => creaElemento(),
  };
  const classList = {
    add: (...c: string[]) => c.forEach((x) => t._cl.add(x)),
    remove: (...c: string[]) => c.forEach((x) => t._cl.delete(x)),
    toggle: (c: string, on?: boolean) => {
      const v = on === undefined ? !t._cl.has(c) : !!on;
      if (v) t._cl.add(c);
      else t._cl.delete(c);
      return v;
    },
    contains: (c: string) => t._cl.has(c),
  };
  const niente = () => undefined;
  const el: any = new Proxy(t, {
    get(o, k) {
      if (typeof k === "symbol") return undefined;
      if (k in o) return o[k];
      if (k in metodi) return metodi[k];
      if (k === "classList") return classList;
      if (k === "options") return tuttofare();
      if (DATI.has(k) || k[0] === "_" || k.startsWith("on")) return undefined;
      return niente; // focus, blur, remove, scrollIntoView, appendChild, prepend…
    },
    set(o, k, v) {
      o[k as any] = v;
      return true;
    },
  });
  return el;
}

export function creaAmbiente(s: Servizi) {
  const elementi: Record<string, any> = {};
  const globali: Record<string, Function[]> = {};
  const colori = s.colori || {};
  let hash = "esplora";
  let vivo = true;

  const ascolta = (ev: string, fn: Function) => void (globali[ev] = globali[ev] || []).push(fn);
  const smetti = (ev: string, fn: Function) => void (globali[ev] = (globali[ev] || []).filter((f) => f !== fn));
  const lancia = (ev: string, extra?: any) => (globali[ev] || []).slice().forEach((f) => {
    if (!vivo) return;
    try { f(Object.assign({ type: ev }, extra)); } catch (e) { console.warn("motore:", ev, e); }
  });

  // con la struttura del sito: una pagina vera (linkedom); senza, una pagina finta che non fa niente (test semplici)
  const vero = s.corpo ? creaDom(s.corpo) : null;
  const document: any = vero ? vero.document : {
    getElementById: (id: string) => elementi[id] || (elementi[id] = creaElemento(id)),
    querySelectorAll: () => [],
    querySelector: () => creaElemento(),
    createElement: () => creaElemento(),
    createTextNode: () => creaElemento(),
    body: creaElemento("body"),
    documentElement: creaElemento("html"),
    head: creaElemento("head"),
    addEventListener: (ev: string, fn: Function) => ascolta("doc:" + ev, fn),
    removeEventListener: (ev: string, fn: Function) => smetti("doc:" + ev, fn),
    visibilityState: "visible",
    hidden: false,
    title: "AllDogs",
  };
  if (vero) {
    const prendi = document.getElementById.bind(document);
    // un elemento che il sito cerca ma che nella struttura non c'è: gli do un sostituto nascosto, così il codice non si ferma.
    // Il sostituto resta FUORI dalla pagina: se poi l'elemento vero compare (per esempio un modulo ridisegnato), vince sempre quello vero.
    const sostituti = new Map<string, any>();
    const scatola = document.createElement("div"); // contenitore staccato: i sostituti hanno un genitore ma non sono nella pagina
    document.getElementById = (id: string) => {
      const e = prendi(id);
      if (e) return e;
      let n = sostituti.get(id);
      if (!n) { n = document.createElement("div"); n.id = id; n.setAttribute("hidden", ""); scatola.appendChild(n); sostituti.set(id, n); }
      return n;
    };
    try { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); } catch {}
  }

  const cambia = (h: string, avvisa = true) => {
    h = String(h).replace(/^.*#/, "");
    if (h === hash) return;
    hash = h;
    // come nel browser: prima finisce il codice in corso, poi parte il cambio di pagina
    setTimeout(() => {
      lancia("hashchange");
      if (avvisa && s.cambioPagina) s.cambioPagina(hash);
    }, 0);
  };
  const location: any = {
    protocol: "https:", pathname: "/ALLDOGS/", origin: "https://parseng.github.io", search: "", host: "parseng.github.io",
    get href() { return s.sito + "#" + hash; },
    get hash() { return "#" + hash; },
    set hash(v: string) { cambia(v); },
    replace: (u: string) => cambia(u),
    assign: (u: string) => cambia(u),
    reload: () => s.ricarica && s.ricarica(),
  };
  const history: any = { length: 1, replaceState() {}, pushState() {}, back() {} };

  const navigator: any = {
    get onLine() { return s.online ? s.online() : true; },
    userAgent: "AllDogsApp", language: "it-IT",
    vibrate: (p: any) => { if (s.vibra) s.vibra(p); return true; },
  };
  if (s.posizione) navigator.geolocation = { getCurrentPosition: s.posizione.una, watchPosition: s.posizione.segui, clearWatch: s.posizione.ferma };
  if (s.condividi) navigator.share = s.condividi;
  if (s.copia) navigator.clipboard = { writeText: s.copia };

  const fetchSito = ((u: any, o?: any) => {
    if (typeof u === "string" && !/^[a-z][a-z0-9+.-]*:/i.test(u)) u = s.sito + u.replace(/^\.?\//, "");
    return s.fetch(u, o);
  }) as typeof fetch;

  const speechSynthesis = s.parla
    ? { speak: (u: any) => s.parla!(String((u && u.text) || ""), { rate: u && u.rate }), cancel: () => s.zitto && s.zitto(), getVoices: () => [], speaking: false, pending: false }
    : undefined;
  class SpeechSynthesisUtterance { text: string; lang = "it-IT"; rate = 1; pitch = 1; volume = 1; voice = null; constructor(t: string) { this.text = t; } }
  class Evento { type: string; constructor(t: string) { this.type = t; } }
  class Immagine { onload: any; onerror: any; width = 0; height = 0; private _s = ""; set src(v: string) { this._s = v; setTimeout(() => this.onerror && this.onerror(new Evento("error")), 0); } get src() { return this._s; } }
  class Osservatore { observe() {} unobserve() {} disconnect() {} }

  const sessione = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => (sessione.has(k) ? sessione.get(k)! : null),
    setItem: (k: string, v: string) => void sessione.set(k, String(v)),
    removeItem: (k: string) => void sessione.delete(k),
    clear: () => sessione.clear(), key: (i: number) => [...sessione.keys()][i] ?? null,
    get length() { return sessione.size; },
  };

  // un errore dentro una funzione "della pagina" non deve mai far cadere l'app
  const tempi = new Set<any>();
  const sicura = (f: any) => (typeof f !== "function" ? f : (...a: any[]) => {
    if (!vivo) return;
    try { return f(...a); } catch (e) { console.warn("motore:", e); }
  });

  const amb: any = {
    document, location, history, navigator,
    localStorage: s.archivio, sessionStorage,
    fetch: fetchSito,
    setTimeout: (f: any, ms?: number, ...a: any[]) => setTimeout(sicura(f), ms, ...a),
    clearTimeout: (t: any) => clearTimeout(t),
    setInterval: (f: any, ms?: number, ...a: any[]) => { const t = setInterval(sicura(f), ms, ...a); tempi.add(t); return t; },
    clearInterval: (t: any) => { tempi.delete(t); clearInterval(t); },
    requestAnimationFrame: (f: any) => setTimeout(sicura(() => f(Date.now())), 16) as any,
    cancelAnimationFrame: (t: any) => clearTimeout(t),
    addEventListener: ascolta, removeEventListener: smetti, dispatchEvent: (e: any) => (lancia(e && e.type, e), true),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    getComputedStyle: () => ({ getPropertyValue: (v: string) => colori[v] || "" }),
    indexedDB: undefined, caches: undefined,
    speechSynthesis, SpeechSynthesisUtterance,
    alert: (t: string) => s.avviso && s.avviso(String(t)),
    confirm: (t: string) => (s.conferma ? s.conferma(String(t)) : false), // domanda del telefono: al "sì" il tocco viene ripetuto
    prompt: () => null,
    open: (u: string) => { if (s.apri) s.apri(u); return null; },
    scrollTo() {}, Image: Immagine, Event: Evento,
    IntersectionObserver: Osservatore, ResizeObserver: Osservatore, MutationObserver: Osservatore,
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    mapboxgl: s.mapboxgl,
    Blob: (globalThis as any).Blob, URL: (globalThis as any).URL, console,
    crypto: { getRandomValues: (a: any) => { if (s.casuale) return s.casuale(a); for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; } },
  };
  amb.window = {
    get supabase() { return s.supabase; },
    speechSynthesis, scrollY: 0, scrollTo() {}, addEventListener: ascolta, removeEventListener: smetti,
    mapboxgl: s.mapboxgl, __mbErr: 0, AllDogsAnim: undefined, ResizeObserver: undefined,
    location, document, navigator, localStorage: s.archivio,
  };

  return {
    amb,
    el: (id: string) => document.getElementById(id) as any,
    lancia,
    /** l'app nativa ha cambiato schermata: il motore si allinea (senza richiamare l'app) */
    vaiA(h: string) { h = h.replace(/^#/, ""); if (h === hash) return; hash = h; lancia("hashchange"); },
    hash: () => hash,
    /** ferma tutto: si usa quando il motore viene ricreato (cambio di cane) */
    spegni() { vivo = false; tempi.forEach((t) => clearInterval(t)); tempi.clear(); },
  };
}
