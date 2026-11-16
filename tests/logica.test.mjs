// Test della logica pura di AllDogs (niente rete, niente segreti): si lanciano con "npm test" o "npm run test:logica".
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./harness.mjs";

process.on("unhandledRejection", () => {}); // l'avvio dell'app prova a caricare dati dalla rete: nei test non c'è
const app = loadApp();
const $ = (expr) => app.get(expr);
const call = (fn, ...args) => app.get(fn)(...args);

const CANE = { name: "Fido", breed: "Meticcio", age: 4, weight: 20, train: "medio", agil: "media", coat: "corto", brachy: false, pat: {}, patOther: "", health: {} };
const cane = (x = {}) => JSON.parse(JSON.stringify({ ...CANE, ...x }));

// meteo finto per un punto: temperatura percepita uguale tutto il giorno
function meteo(punto, percepita) {
  const H = Array(24).fill(percepita);
  app.get("wx")[app.get("wxKey")(punto)] = {
    hourly: { temperature_2m: H, apparent_temperature: H, precipitation_probability: Array(24).fill(0), weather_code: Array(24).fill(0) },
    daily: { time: ["2026-07-01"], sunrise: ["2026-07-01T05:30"], sunset: ["2026-07-01T20:45"] },
  };
}

test("quanto può camminare: cane adulto medio", () => {
  const c = call("capacity", cane());
  assert.equal(c.km, 12);
  assert.equal(c.up, 700);
  assert.ok(!c.sensitive, "non è un cane sensibile al caldo");
});

test("quanto può camminare: cucciolo, anziano, muso schiacciato, convalescenza", () => {
  assert.ok(call("capacity", cane({ age: 0.5 })).km <= 4, "cucciolo: massimo 4 km");
  assert.ok(call("capacity", cane({ age: 12 })).km < 12, "anziano: meno strada");
  assert.ok(call("capacity", cane({ brachy: true })).km < 12, "muso schiacciato: meno strada");
  assert.ok(call("capacity", cane({ pat: { conv: true } })).km <= 3, "convalescenza: massimo 3 km");
  assert.equal(call("capacity", cane({ pat: { art: true } })).agil, "bassa", "articolazioni: agilità bassa");
});

test("caldo: muso schiacciato e 'soffre il caldo' abbassano la soglia", () => {
  const normale = call("capacity", cane()).heat;
  assert.ok(call("capacity", cane({ brachy: true })).heat < normale);
  assert.ok(call("capacity", cane({ caldo: true })).heat < normale);
  assert.ok(call("capacity", cane({ pat: { cuore: true } })).heat < call("capacity", cane({ brachy: true })).heat, "cuore: ancora più prudente");
});

test("verdetto: distanza dentro, un po' oltre e troppo oltre il limite", () => {
  const it = (km) => ({ len: km * 1000, up: 100, scale: "T", start: null, loop: true });
  const lvl = (km) => call("verdict", it(km), cane(), 0).why[0].lvl;
  assert.equal(lvl(10), 0, "10 km per un limite di 12: va bene");
  assert.equal(lvl(14), 1, "14 km: con prudenza");
  assert.equal(lvl(20), 2, "20 km: troppo");
});

test("verdetto: andata e ritorno conta anche il ritorno", () => {
  const r = call("verdict", { len: 8000, one: 4000, up: 100, scale: "T", start: null, loop: false }, cane(), 0);
  assert.match(r.why[0].txt, /andata e ritorno/);
  assert.match(r.why[0].txt, /4,0 km all'andata/);
});

test("verdetto: difficoltà EEA mai adatta ai cani, EE solo per cani agili e allenati", () => {
  const it = (scale) => ({ len: 5000, up: 200, scale, start: null, loop: true });
  assert.ok(call("verdict", it("EEA"), cane({ agil: "alta", train: "molto" }), 0).why.some((w) => w.lvl === 2));
  assert.ok(call("verdict", it("EE"), cane(), 0).why.some((w) => w.lvl === 2), "EE per cane medio: sconsigliato");
  assert.ok(!call("verdict", it("EE"), cane({ agil: "alta", train: "molto" }), 0).why.some((w) => w.lvl === 2), "EE per cane agile e allenato: con prudenza");
});

test("verdetto con il caldo: il cane sensibile è giudicato più severamente", () => {
  const p = [40.85, 14.25];
  meteo(p, 23); // 23 gradi percepiti: sopra la soglia di un cane sensibile (21), sotto quella di uno normale (24)
  const it = { len: 5000, up: 100, scale: "T", start: p, loop: true };
  const normale = call("verdict", it, cane(), 0), sensibile = call("verdict", it, cane({ brachy: true }), 0);
  assert.ok(sensibile.v > normale.v, `il cane col muso schiacciato deve avere un verdetto più prudente (${sensibile.v} vs ${normale.v})`);
  meteo(p, 36);
  assert.equal(call("verdict", it, cane(), 0).v, 2, "36 gradi percepiti tutto il giorno: sconsigliato");
});

test("formato delle ore", () => {
  assert.match(call("fmtH", 1.5), /1 h 30/);
});

test("progressi giornalieri: somma per cane e per giorno", () => {
  const giorno = (s) => new Date(s + "T10:00:00").getTime();
  const acts = [
    { t: giorno("2026-11-14"), dist: 3000, dur: 45 * 60000, steps: 4000, dogs: ["d1"] },
    { t: giorno("2026-11-14") + 3600e3, dist: 1000, dur: 15 * 60000, dogs: ["d1", "d2"] },
    { t: giorno("2026-11-13"), dist: 2000, dur: 30 * 60000 }, // vecchia uscita senza cani: va al primo cane
  ];
  const train = { d1: { st: { seduto: { s: "2026-11-14", ok: true }, resta: { s: "2026-11-20", ok: false } } } };
  const days = call("progressiGiornalieri", acts, ["d1", "d2"], (id) => train[id] || null, () => null, "2026-11-15", 0.75, "d1");
  const a = days["d1|2026-11-14"];
  assert.equal(a.m, 4000);
  assert.equal(a.min, 60);
  assert.equal(a.passi, 4000 + Math.round(1000 / 0.75), "passi veri + passi stimati");
  assert.equal(a.ob.uscite, 2);
  assert.deepEqual([...a.ob.lezioni_imparate], ["seduto"]);
  assert.equal(days["d2|2026-11-14"].m, 1000, "il secondo cane conta solo l'uscita fatta insieme");
  assert.equal(days["d1|2026-11-13"].ob.uscite, 1);
  assert.equal(days["d1|2026-11-20"], undefined, "niente giorni nel futuro");
});

test("progressi giornalieri: programma di allenamento rispettato o no", () => {
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const t0 = oggi.getTime() - 3 * 864e5;
  const goal = { from: 2, target: 5, start: t0, end: t0 + 60 * 864e5, longDow: new Date(t0).getDay(), r: 0.1 };
  const dk = app.get("dKey");
  const acts = [{ t: t0 + 10 * 3600e3, dist: 2100, dur: 40 * 60000, dogs: ["d1"] }];
  const days = call("progressiGiornalieri", acts, ["d1"], () => null, () => goal, dk(Date.now()), 0.75, "d1");
  const primo = days["d1|" + dk(t0)];
  assert.equal(primo.ob.programma.tipo, "lunga", "il primo giorno è quello della passeggiata lunga");
  assert.equal(primo.ob.programma.raggiunto, true, "2,1 km su 2 previsti: raggiunto");
  assert.equal(days["d1|" + dk(t0 + 864e5)].ob.programma.tipo, "riposo");
});

test("orari liberi: fasce riutilizzabili per le notifiche", () => {
  const s = call("orariSlots", { feriali: ["mattina"], weekend: ["sera"] });
  assert.equal(s.length, 2);
  assert.deepEqual([...s[0].giorni], [1, 2, 3, 4, 5]);
  assert.equal(s[0].dalle, "7:00");
  assert.deepEqual([...s[1].giorni], [6, 0]);
});

test("sicurezza: i testi vengono resi innocui prima di finire nella pagina", () => {
  assert.equal(call("esc", `<img src=x onerror="alert(1)">`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  assert.equal(call("esc", null), "");
});
