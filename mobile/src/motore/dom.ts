// Una "pagina" vera ma invisibile per il motore: è la stessa struttura del sito (index.html), letta con linkedom.
// Così le parti del sito che costruiscono elenchi, moduli e bottoni funzionano come nel browser,
// e l'app li ridisegna in modo nativo con il nuovo stile (ui/HtmlMotore.tsx).
import { DOMParser } from "linkedom";

let sistemato = false;
function sistemaPrototipi(window: any, document: any) {
  if (sistemato) return;
  sistemato = true;
  const El = Object.getPrototypeOf(Object.getPrototypeOf(document.createElement("div")));
  const niente = function () {};
  for (const n of ["scrollIntoView", "focus", "blur", "scrollTo", "select", "requestFullscreen"]) if (typeof El[n] !== "function") El[n] = niente;
  if (typeof El.getBoundingClientRect !== "function") El.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 });
  for (const n of ["offsetHeight", "offsetWidth", "clientHeight", "clientWidth", "scrollHeight", "scrollWidth", "offsetTop"]) {
    if (n in El) continue;
    Object.defineProperty(El, n, { configurable: true, get() { return (this as any)["_" + n] || 0; }, set(v) { (this as any)["_" + n] = v; } });
  }
  if (!("scrollTop" in El)) Object.defineProperty(El, "scrollTop", { configurable: true, get() { return 0; }, set() {} });
  // <canvas>: disegna nel vuoto (le miniature e le misure del testo servono solo al sito)
  const tela: any = new Proxy({}, { get: (t: any, k) => (k in t ? t[k] : k === "measureText" ? () => ({ width: 0 }) : k === "getImageData" || k === "createImageData" ? () => ({ data: [] }) : () => undefined), set: (t, k, v) => ((t[k] = v), true) });
  const cv = Object.getPrototypeOf(document.createElement("canvas"));
  for (const P of [El, cv]) { try { Object.defineProperty(P, "getContext", { configurable: true, writable: true, value: () => tela }); Object.defineProperty(P, "toDataURL", { configurable: true, writable: true, value: () => "" }); } catch {} }
  // click: chiama onclick e gli ascoltatori, risalendo agli elementi genitori come nel browser
  El.click = function () { simulaTocco(this); };
  // <details open>
  const det = Object.getPrototypeOf(document.createElement("details"));
  if (!("open" in det) || !Object.getOwnPropertyDescriptor(det, "open")) {
    Object.defineProperty(El, "open", { configurable: true, get() { return this.hasAttribute("open"); }, set(v) { if (v) this.setAttribute("open", ""); else this.removeAttribute("open"); } });
  }
  // <input type=checkbox>
  const inp = Object.getPrototypeOf(document.createElement("input"));
  Object.defineProperty(inp, "checked", { configurable: true, get() { return this._ck !== undefined ? this._ck : this.hasAttribute("checked"); }, set(v) { this._ck = !!v; } });
  // <select>: valore e scelta come nel browser
  const sel = Object.getPrototypeOf(document.createElement("select"));
  const opzioni = (s: any) => Array.from(s.querySelectorAll("option")) as any[];
  const valOpz = (o: any) => (o.hasAttribute("value") ? o.getAttribute("value") : o.textContent);
  Object.defineProperty(sel, "value", {
    configurable: true,
    get() { const L = opzioni(this); const o = L.find((x) => x.hasAttribute("selected")) || L[0]; return o ? valOpz(o) : ""; },
    set(v) { const L = opzioni(this); L.forEach((x) => x.removeAttribute("selected")); const o = L.find((x) => valOpz(x) === String(v)); if (o) o.setAttribute("selected", ""); },
  });
  Object.defineProperty(sel, "selectedIndex", {
    configurable: true,
    get() { const L = opzioni(this); return Math.max(0, L.findIndex((x) => x.hasAttribute("selected"))); },
    set(i) { const L = opzioni(this); L.forEach((x, k) => (k === i ? x.setAttribute("selected", "") : x.removeAttribute("selected"))); },
  });
  Object.defineProperty(sel, "options", { configurable: true, get() { const L: any = opzioni(this); L.forEach((o: any) => { if (!("text" in o)) Object.defineProperty(o, "text", { configurable: true, get() { return o.textContent; }, set(t) { o.textContent = t; } }); }); return L; } });
}

/** simula un tocco: evento che "sale" dall'elemento ai genitori, con onclick e addEventListener */
export function simulaTocco(el: any) {
  let fermo = false;
  const ev: any = { type: "click", target: el, bubbles: true, preventDefault() {}, stopPropagation() { fermo = true; }, stopImmediatePropagation() { fermo = true; } };
  for (let n = el; n && !fermo; n = n.parentNode) {
    ev.currentTarget = n;
    if (typeof n.onclick === "function") { try { n.onclick.call(n, ev); } catch (e) { console.warn("motore: tocco", e); } }
    const L = n._ascolti && n._ascolti.click;
    if (L) for (const f of L.slice()) { try { f.call(n, ev); } catch (e) { console.warn("motore: tocco", e); } }
    if (n.nodeType === 9) break;
  }
}
/** evento di modifica (input/change) su un campo */
export function simulaCambio(el: any, tipo: "input" | "change") {
  const ev: any = { type: tipo, target: el, currentTarget: el, preventDefault() {}, stopPropagation() {} };
  const h = el["on" + tipo];
  if (typeof h === "function") { try { h.call(el, ev); } catch (e) { console.warn("motore:", tipo, e); } }
  const L = el._ascolti && el._ascolti[tipo];
  if (L) for (const f of L.slice()) { try { f.call(el, ev); } catch (e) { console.warn("motore:", tipo, e); } }
  // anche "submit" del modulo, se un campo invia
}

export function creaDom(corpo: string) {
  // si usa solo il documento: la "finestra" di linkedom avvolge l'oggetto globale e sul telefono (Hermes) dà errore
  const document: any = new (DOMParser as any)().parseFromString(`<!doctype html><html lang="it"><head></head>${corpo}</html>`, "text/html");
  const window: any = {};
  try { Object.defineProperty(document, "defaultView", { configurable: true, value: { location: { href: "https://parseng.github.io/ALLDOGS/" } } }); } catch {}
  sistemaPrototipi(window, document);
  // gli ascoltatori aggiunti con addEventListener li tengo anche io, per i tocchi simulati
  const El = Object.getPrototypeOf(Object.getPrototypeOf(document.createElement("div")));
  if (!El.__adOk) {
    El.__adOk = true;
    const add = El.addEventListener, rem = El.removeEventListener;
    El.addEventListener = function (t: string, f: any, o?: any) { (this._ascolti = this._ascolti || {})[t] = (this._ascolti[t] || []).concat(f); try { return add && add.call(this, t, f, o); } catch {} };
    El.removeEventListener = function (t: string, f: any, o?: any) { if (this._ascolti && this._ascolti[t]) this._ascolti[t] = this._ascolti[t].filter((x: any) => x !== f); try { return rem && rem.call(this, t, f, o); } catch {} };
  }
  return { window, document };
}
