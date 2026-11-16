// Prova l'app sul PC dentro un browser a misura di telefono e salva delle immagini.
// Prima: npx expo start --web --port 8090
// Uso: node tools/prova-app.mjs <cartella> [passi...]
//   passi: shot:nome | click:Testo | clicklabel:Etichetta | wait:ms | scroll:px | type:testo | nuovo (senza cane salvato) | eval:codice
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright-core");
const OUT = process.argv[2] || ".prova";
const passi = process.argv.slice(3);
mkdirSync(OUT, { recursive: true });
const SITO = "https://parseng.github.io/ALLDOGS/";
const CANE = { id: "d1", name: "Gohan", breed: "Pastore australiano", age: 3, weight: 22, train: "medio", agil: "media", coat: "lungo", brachy: false, pat: {}, patOther: "", health: {}, onb: 1 };

const browser = await chromium.launch({ channel: "msedge" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, locale: "it-IT", geolocation: { latitude: 40.8385, longitude: 14.0745 }, permissions: ["geolocation"] });
const page = await ctx.newPage();
page.on("console", (m) => { const t = m.text(); if (m.type() === "error" || /motore:|mappa:|nav:/.test(t)) console.log("[" + m.type() + "]", t.slice(0, 400)); });
page.on("pageerror", (e) => console.log("[eccezione]", String(e).slice(0, 600)));
// L'app di prova viene servita "come se fosse" sul sito: così la mappa accetta le richieste (il token è limitato al sito)
const FINTO = "https://parseng.github.io";
await ctx.route((u) => u.origin === FINTO && !u.pathname.startsWith("/ALLDOGS/"), async (r) => {
  try { const u = new URL(r.request().url()); const h = { ...r.request().headers() }; delete h.host; delete h.origin; delete h.referer; const risp = await r.fetch({ url: "http://localhost:8090" + u.pathname + u.search, headers: h }); await r.fulfill({ response: risp }); }
  catch (e) { await r.abort(); }
});
if (!passi.includes("nuovo")) {
  await page.addInitScript((c) => {
    if (!localStorage.getItem("alldogs-dog")) {
      localStorage.setItem("alldogs-dog", JSON.stringify(c));
      localStorage.setItem("alldogs-view", JSON.stringify({ c: [40.84, 14.09], z: 11.6, b: [[40.78, 13.98], [40.9, 14.2]] }));
    }
  }, CANE);
}
await page.goto(FINTO + "/", { waitUntil: "load", timeout: 180000 });
await page.waitForTimeout(6000);
for (const p of passi) {
  const i = p.indexOf(":"), k = i < 0 ? p : p.slice(0, i), v = i < 0 ? "" : p.slice(i + 1);
  try {
    if (k === "shot") await page.screenshot({ path: `${OUT}/${v}.png` });
    else if (k === "click") await page.getByText(v, { exact: false }).first().click({ timeout: 8000 });
    else if (k === "clicklabel") await page.getByLabel(v, { exact: false }).first().click({ timeout: 8000 });
    else if (k === "wait") await page.waitForTimeout(+v);
    else if (k === "scroll") await page.mouse.wheel(0, +v);
    else if (k === "type") await page.keyboard.type(v, { delay: 30 });
    else if (k === "eval") console.log("eval:", JSON.stringify(await page.evaluate(v)));
  } catch (e) { console.log("passo fallito:", p, "→", String(e.message).split("\n")[0]); }
  if (k !== "wait" && k !== "shot") await page.waitForTimeout(700);
}
await browser.close();
