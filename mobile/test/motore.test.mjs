// Prova sul PC che il motore (le regole del sito) funzioni dentro il "browser finto" dell'app.
// Si lancia con: npm test   (la prova "con internet" scarica i sentieri veri dal sito)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";
registerHooks({ resolve(spec, ctx, next) { try { return next(spec, ctx); } catch (e) { if (spec.startsWith(".")) return next(spec + ".ts", ctx); throw e; } } });
const { creaAmbiente } = await import("../src/motore/ambiente.ts");
const { CORPO } = await import("../src/motore/corpo.generated.ts");

const QUI = fileURLToPath(new URL(".", import.meta.url));
process.on("unhandledRejection", () => {});

function carica() {
  const src = readFileSync(QUI + "../src/motore/web.generated.js", "utf8").replace("export function creaMotore", "globalThis.__crea=function creaMotore");
  vm.runInThisContext(src, { filename: "web.generated.js" });
  return globalThis.__crea;
}
const CANE = { id: "d1", name: "Gohan", breed: "Pastore australiano", age: 3, weight: 22, train: "medio", agil: "media", coat: "lungo", brachy: false, pat: {}, patOther: "", health: {} };

export function nuovoMotore({ dati = {}, rete = false } = {}) {
  const mem = new Map(Object.entries(dati).map(([k, v]) => [k, JSON.stringify(v)]));
  const archivio = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => void mem.set(k, String(v)), removeItem: (k) => void mem.delete(k),
    clear: () => mem.clear(), key: (i) => [...mem.keys()][i] ?? null, get length() { return mem.size; },
  };
  const pagine = [];
  const A = creaAmbiente({
    archivio, sito: "https://parseng.github.io/ALLDOGS/",
    fetch: rete ? fetch : () => Promise.reject(new Error("niente rete nei test")),
    cambioPagina: (h) => pagine.push(h),
    corpo: CORPO,
  });
  const M = carica()(A.amb);
  return { M, A, mem, pagine };
}

test("il motore parte senza cane e chiede il primo avvio", async () => {
  const { M, A } = nuovoMotore();
  assert.equal(M.S.dog, null);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(A.hash(), "cane");
});

test("limiti del cane e verdetto", () => {
  const { M } = nuovoMotore({ dati: { "alldogs-dog": CANE } });
  const c = M.capacity(CANE);
  assert.equal(c.km, 15); // regole per razza (pastore australiano, 3 anni, allenamento medio)
  assert.equal(c.up, 900);
  assert.ok(c.sensitive, "pelo lungo: soffre di più il caldo");
  const v = M.verdict({ len: 30000, up: 200, scale: "T", start: [40.8, 14.2], loop: true }, CANE, 0);
  assert.equal(v.v, 2, "30 km sono troppi");
  assert.match(v.short, /troppo lungo/);
});

test("i filtri si leggono dalla pagina finta", () => {
  const { M, A } = nuovoMotore({ dati: { "alldogs-dog": CANE } });
  assert.ok(!M.activeFilters());
  A.el("f-len").value = "0-5";
  assert.ok(M.activeFilters());
});

test("con internet: carica i sentieri di una zona e li giudica", { skip: !process.env.RETE }, async () => {
  const { M } = nuovoMotore({ dati: { "alldogs-dog": CANE }, rete: true });
  for (let i = 0; i < 100 && !M.S.ready; i++) await new Promise((r) => setTimeout(r, 100));
  assert.ok(M.S.ready, "indice dei sentieri caricato");
  M.S.view = { c: [40.84, 14.09], z: 12, b: [[40.78, 14.0], [40.9, 14.2]] };
  await M.refreshView();
  assert.ok(M.S.rows.length > 3, "sentieri trovati ai Campi Flegrei: " + M.S.rows.length);
  const r = M.S.rows[0];
  assert.ok(r.tr.name && r.res && typeof r.res.hours === "number");
  console.log("  esempio:", r.tr.name, "→", M.VLABEL[r.res.v] || "sto valutando", "·", M.fmtH(r.res.hours));
});
