// Prova sul PC la mappa dell'app: motore + mappa a distanza + pagina vera dentro un browser (Chromium).
// Uso: node tools/prova-mappa.mjs [cartella per le immagini]
import { readFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { registerHooks } from "node:module";
// i file dell'app si importano senza ".ts": qui lo aggiungo io
registerHooks({ resolve(spec, ctx, next) { try { return next(spec, ctx); } catch (e) { if (spec.startsWith(".")) return next(spec + ".ts", ctx); throw e; } } });
const { creaAmbiente } = await import("../src/motore/ambiente.ts");
const { azzeraMappa, collegaMotore, mapboxFinto, mappaRemota } = await import("../src/mappa/remota.ts");
const { paginaMappa } = await import("../src/mappa/pagina.ts");
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const QUI = fileURLToPath(new URL(".", import.meta.url));
const OUT = process.argv[2] || QUI + "../.prova";
mkdirSync(OUT, { recursive: true });
process.on("unhandledRejection", (e) => console.log("rifiuto:", e && e.message));
const SITO = "https://parseng.github.io/ALLDOGS/";
const attesa = (ms) => new Promise((r) => setTimeout(r, ms));

const src = readFileSync(QUI + "../src/motore/web.generated.js", "utf8").replace("export function creaMotore", "globalThis.__crea=function creaMotore");
vm.runInThisContext(src, { filename: "web.generated.js" });
const mem = new Map([["alldogs-dog", JSON.stringify({ id: "d1", name: "Gohan", breed: "Pastore australiano", age: 3, weight: 22, train: "medio", agil: "media", coat: "lungo", brachy: false, pat: {}, patOther: "", health: {} })],
  ["alldogs-view", JSON.stringify({ c: [40.84, 14.09], z: 11.6, b: [[40.78, 13.98], [40.9, 14.2]] })]]);
const archivio = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k), clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; } };
const A = creaAmbiente({ archivio, sito: SITO, fetch: (u, o) => fetch(u, String(u).includes("mapbox.com") ? { ...o, headers: { Referer: SITO, ...(o && o.headers) } } : o), mapboxgl: mapboxFinto,
  colori: { "--ok": "#3E8E41", "--warn": "#D99A1C", "--no": "#D4503C", "--wait": "#8C9486" } });
azzeraMappa();
const M = globalThis.__crea(A.amb);
collegaMotore(M);
M.setInteractive = (on) => mappaRemota.manda(["inter", !!on]);
M.toast = (t) => console.log("avviso:", t);

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 390, height: 520 }, deviceScaleFactor: 1 });
page.on("console", (m) => { if (m.type() === "error") console.log("pagina errore:", m.text().slice(0, 300)); });
page.on("pageerror", (e) => console.log("pagina eccezione:", String(e).slice(0, 400)));
const v = M.S.view;
const html = paginaMappa({ c: v.c, z: v.z, stile: M.wantStyle(), map3d: false, hillOn: false, wxOv: null });
await page.route(SITO + "mappa-app", (r) => r.fulfill({ contentType: "text/html", body: html }));
const bers = { id: 1, manda: (cmds) => page.evaluate((c) => window.AD && window.AD(c), cmds).catch((e) => console.log("manda:", e.message)) };
let pronta = false; const visti = {};
await page.exposeFunction("__rn", (txt) => { const m = JSON.parse(txt); visti[m.t] = (visti[m.t] || 0) + 1;
  if (m.t === "log" || m.t === "err" || m.t === "toast") console.log("pagina:", m.t, m.m);
  if (m.t === "fly") { globalThis.__fly = m; return; }
  if (m.t === "style" && !pronta) { pronta = true; mappaRemota.attiva(bers); return; }
  mappaRemota.daPagina(1, m); });
await page.addInitScript(() => { window.ReactNativeWebView = { postMessage: (t) => window.__rn(t) }; });
await page.goto(SITO + "mappa-app");
for (let i = 0; i < 150 && !(pronta && M.S.ready && (M.S.rows || []).length); i++) await attesa(200);
console.log("pronta:", pronta, "sentieri in elenco:", (M.S.rows || []).length, "stile:", M.styleNow, "styleOK:", M.styleOK);
await attesa(3500);
await page.screenshot({ path: OUT + "/1-esplora.png" });
// tocco su un sentiero: anteprima
const r0 = M.S.rows[0];
if (r0) { M.peek(r0.tr.id); await attesa(2500); await page.screenshot({ path: OUT + "/2-anteprima.png" }); console.log("anteprima:", r0.tr.name, "→", M.S.peek); }
// scheda sentiero
if (r0) { A.vaiA("s-" + r0.tr.id); await attesa(3000); await page.screenshot({ path: OUT + "/3-sentiero.png" }); console.log("scena:", M.scene.mode);
  mappaRemota.manda(["fly", { path: r0.tr.path, prof: (M.elev[r0.tr.id] || {}).p, len: r0.tr.len, shape: r0.tr.shape || "loop", ret: r0.tr.ret || 0 }]);
  await attesa(6000); await page.screenshot({ path: OUT + "/4-volo.png" }); console.log("volo:", JSON.stringify(globalThis.__fly));
  mappaRemota.manda(["flyctl", "stop"]); await attesa(1200); }
// mappa satellite + pioggia prevista
A.vaiA("esplora"); await attesa(1500);
M.setStyleKind("sat"); await attesa(4000); await page.screenshot({ path: OUT + "/5-satellite.png" }); console.log("stile:", M.styleNow, M.styleOK);
M.setStyleKind("map"); await attesa(2500); M.setStyleKind("temp"); await attesa(5000); await page.screenshot({ path: OUT + "/6-temperatura.png" });
console.log("messaggi dalla pagina:", JSON.stringify(visti));
await browser.close();
process.exit(0);
