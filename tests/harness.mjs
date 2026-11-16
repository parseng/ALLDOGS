// Carica lo script principale di index.html in una "pagina finta" (senza browser e senza librerie),
// così i test possono chiamare le funzioni di calcolo dell'app così come sono.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

// oggetto "tuttofare": qualsiasi proprietà o chiamata restituisce di nuovo lui (per gli elementi della pagina)
function stub() {
  const fn = function () { return p; };
  const p = new Proxy(fn, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return () => "";
      if (k === Symbol.iterator) return function* () {};
      if (k === "then") return undefined;
      if (k in t && typeof t[k] !== "function") return t[k];
      if (k === "length") return 0;
      if (k === "style" || k === "dataset" || k === "classList") return t[k] || (t[k] = stub());
      return p;
    },
    set(t, k, v) { t[k] = v; return true; },
    apply() { return p; },
    construct() { return p; },
  });
  return p;
}

export function loadApp({ storage = {} } = {}) {
  const html = readFileSync(ROOT + "index.html", "utf8");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
  if (main.length < 10000) throw new Error("script principale non trovato");

  const store = new Map(Object.entries(storage).map(([k, v]) => [k, JSON.stringify(v)]));
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  const doc = stub();
  const ctx = {
    console, Math, Date, JSON, Intl, Promise, Map, Set, WeakMap, Symbol, Array, Object, String, Number, Boolean, RegExp, Error, TypeError,
    URL, URLSearchParams, TextEncoder, TextDecoder, AbortController, structuredClone, encodeURIComponent, decodeURIComponent, isFinite, parseFloat, parseInt, isNaN,
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, requestAnimationFrame: () => 0, queueMicrotask: () => {},
    fetch: () => Promise.reject(new Error("niente rete nei test")),
    localStorage, sessionStorage: localStorage,
    document: doc, navigator: { onLine: false, userAgent: "test", geolocation: stub(), language: "it-IT" },
    location: { protocol: "http:", hash: "#esplora", search: "", pathname: "/ALLDOGS/", origin: "http://localhost", href: "http://localhost/ALLDOGS/#esplora", replace() {}, reload() {} },
    history: { replaceState() {}, pushState() {} },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    getComputedStyle: () => stub(), innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    IntersectionObserver: function () { return stub(); }, ResizeObserver: function () { return stub(); }, MutationObserver: function () { return stub(); },
    Image: function () { return stub(); }, indexedDB: undefined, speechSynthesis: undefined,
    alert() {}, confirm: () => false, prompt: () => null, open: () => null, scrollTo() {},
  };
  ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(main, ctx, { filename: "index.html" });
  // le dichiarazioni "const" e "let" dello script si leggono con un'espressione nello stesso contesto
  return { get: (expr) => vm.runInContext(expr, ctx), ctx, storage: localStorage };
}
