// AllDogs: lavoratore di sfondo (service worker) per usare l'app anche senza internet.
// - L'app (pagina, script, icone, libreria della mappa, caratteri) resta salvata nel telefono.
// - I file dei sentieri già aperti restano disponibili offline.
// - Le mappe dei sentieri scaricati (cache "ad-off-...") vengono servite dal telefono.
const V = "alldogs-v4";
const SHELL = "ad-shell-" + V, DATA = "ad-data", RUN = "ad-run";
const CORE = ["./", "index.html", "lezioni-anim.js", "manifest.json", "icon-192.png", "icon-512.png",
  "https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl/3.9.4/mapbox-gl.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/mapbox-gl/3.9.4/mapbox-gl.min.css"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => 0)))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("ad-shell-") && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// stesso tassello della mappa topografica, qualunque sia il server (a, b o c)
const topoKey = u => "https://tile.opentopomap.org" + u.pathname;
const dataKey = u => u.origin + u.pathname; // senza ?v= / ?t=

async function netFirst(req, cacheName, key, ms) {
  const c = await caches.open(cacheName);
  try {
    const r = await (ms ? Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("lento")), ms))]) : fetch(req));
    if (r && r.ok) c.put(key, r.clone()).catch(() => 0);
    return r;
  } catch (err) {
    const hit = await caches.match(key, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req, cacheName, key) {
  const hit = await caches.match(key);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && (r.ok || r.type === "opaque") && cacheName) (await caches.open(cacheName)).put(key, r.clone()).catch(() => 0);
  return r;
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const u = new URL(req.url);
  // pagina e script dell'app: prima la rete (così le novità arrivano), se manca uso la copia salvata
  if (u.origin === location.origin && !u.pathname.includes("/data/")) {
    if (req.mode === "navigate") { e.respondWith(netFirst(req, SHELL, dataKey(u), 6000).catch(() => caches.match("./").then(r => r || caches.match("index.html")))); return; }
    if (/\.(js|json|png|html|svg|webp|jpg)$/.test(u.pathname)) { e.respondWith(netFirst(req, SHELL, dataKey(u), 6000)); return; }
    return;
  }
  // dati dei sentieri e dei luoghi
  if (u.origin === location.origin) { e.respondWith(netFirst(req, DATA, dataKey(u), 8000)); return; }
  // mappa topografica: prima i tasselli scaricati, poi la rete
  if (/\.tile\.opentopomap\.org$/.test(u.hostname)) { e.respondWith(cacheFirst(req, null, topoKey(u))); return; }
  // caratteri delle scritte sulla mappa, libreria della mappa, caratteri del testo
  if (u.hostname === "api.mapbox.com" && u.pathname.startsWith("/fonts/")) { e.respondWith(cacheFirst(req, RUN, dataKey(u))); return; }
  if (u.hostname === "cdnjs.cloudflare.com" || u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") { e.respondWith(cacheFirst(req, RUN, req.url)); return; }
});
