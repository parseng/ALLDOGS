// Test sul vero progetto Supabase (servono internet e la chiave segreta; NON vanno su GitHub Actions).
// - regole di accesso (RLS): due utenti di prova, il secondo non deve vedere né toccare i dati del primo; alla fine si cancellano
// - funzioni ai-chat e ors-route: origini ammesse, richieste non valide o troppo grandi rifiutate (senza consumare le chiavi)
// Uso: SUPABASE_SECRET_KEY=... npm run test:supabase   (senza la chiave, i test RLS vengono saltati)
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";

const URL_SB = "https://xljgemccvkxlypxrtcbr.supabase.co";
const PUB = "sb_publishable_X_5tyF5-sySPsVo8WEaCBw_t38fvh61";
const SEC = process.env.SUPABASE_SECRET_KEY || "";
const SITO = "https://parseng.github.io";

async function req(method, path, { key = PUB, token, body, headers = {} } = {}) {
  const h = { apikey: key, "Content-Type": "application/json", ...headers };
  if (token) h.Authorization = "Bearer " + token;
  const r = await fetch(URL_SB + path, { method, headers: h, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
  const t = await r.text();
  let j = t;
  try { j = t ? JSON.parse(t) : null; } catch { /* testo */ }
  return { s: r.status, j };
}

// ---------------- regole di accesso ----------------
const utenti = [];
after(async () => {
  for (const u of utenti) await req("DELETE", `/auth/v1/admin/users/${u.id}`, { key: SEC, token: SEC });
});

test("RLS: ognuno vede e modifica solo i propri dati", { skip: !SEC && "manca SUPABASE_SECRET_KEY" }, async (t) => {
  const pw = "Prova-" + randomBytes(8).toString("hex");
  for (const i of [1, 2]) {
    const email = `alldogs.prova${i}.${randomBytes(3).toString("hex")}@prova-alldogs.it`;
    const c = await req("POST", "/auth/v1/admin/users", { key: SEC, token: SEC, body: { email, password: pw, email_confirm: true } });
    assert.ok(c.s === 200 || c.s === 201, "utente di prova creato");
    utenti.push(c.j);
    const l = await req("POST", "/auth/v1/token?grant_type=password", { body: { email, password: pw } });
    assert.equal(l.s, 200, "accesso");
    c.j.tok = l.j.access_token;
  }
  const [A, B] = utenti;
  const pref = { Prefer: "return=representation,resolution=merge-duplicates" };

  await t.test("profilo creato in automatico", async () => {
    const r = await req("GET", "/rest/v1/profiles?select=id", { token: A.tok });
    assert.equal(r.j.length, 1);
    assert.equal(r.j[0].id, A.id);
  });

  const d = await req("POST", "/rest/v1/dogs?on_conflict=owner_id,local_id", { token: A.tok, headers: pref, body: [{ owner_id: A.id, local_id: "d1", nome: "Fido prova" }] });
  assert.ok(d.s < 300, "A salva il suo cane");
  const dog = d.j[0].id;
  const riga = { user_id: A.id, dog_id: dog, giorno: "2026-11-15", passi: 4200, km: 3.2, minuti: 45 };
  assert.ok((await req("POST", "/rest/v1/daily_progress?on_conflict=user_id,dog_id,giorno", { token: A.tok, headers: pref, body: [riga] })).s < 300);
  assert.ok((await req("POST", "/rest/v1/walks?on_conflict=user_id,local_id", { token: A.tok, headers: pref, body: [{ user_id: A.id, local_id: "1", dog_id: dog, inizio: "2026-11-15T08:00:00Z" }] })).s < 300);
  assert.ok((await req("POST", "/rest/v1/reviews?on_conflict=user_id,trail_id", { token: A.tok, headers: pref, body: [{ user_id: A.id, trail_id: "prova-1", voto: 5, testo: "Bello" }] })).s < 300);

  await t.test("stesso giorno salvato due volte: una riga sola", async () => {
    await req("POST", "/rest/v1/daily_progress?on_conflict=user_id,dog_id,giorno", { token: A.tok, headers: pref, body: [{ ...riga, passi: 5000 }] });
    const r = await req("GET", "/rest/v1/daily_progress?select=passi", { token: A.tok });
    assert.equal(r.j.length, 1);
    assert.equal(r.j[0].passi, 5000);
  });

  await t.test("B non vede i dati di A", async () => {
    for (const tab of ["dogs", "walks", "daily_progress", "profiles"]) {
      const r = await req("GET", `/rest/v1/${tab}?select=*`, { token: B.tok });
      assert.equal(r.s, 200);
      assert.equal(r.j.filter((x) => (x.owner_id || x.user_id || x.id) !== B.id).length, 0, tab);
    }
  });

  await t.test("B non scrive a nome di A né usa il cane di A", async () => {
    assert.ok([401, 403].includes((await req("POST", "/rest/v1/daily_progress", { token: B.tok, body: [{ user_id: A.id, dog_id: dog, giorno: "2026-11-16" }] })).s));
    assert.ok([401, 403].includes((await req("POST", "/rest/v1/daily_progress", { token: B.tok, body: [{ user_id: B.id, dog_id: dog, giorno: "2026-11-16" }] })).s));
    assert.deepEqual((await req("PATCH", `/rest/v1/dogs?id=eq.${dog}`, { token: B.tok, body: { nome: "rubato" }, headers: { Prefer: "return=representation" } })).j, []);
    assert.deepEqual((await req("DELETE", `/rest/v1/walks?user_id=eq.${A.id}`, { token: B.tok, headers: { Prefer: "return=representation" } })).j, []);
    assert.deepEqual((await req("PATCH", "/rest/v1/reviews?trail_id=eq.prova-1", { token: B.tok, body: { voto: 1 }, headers: { Prefer: "return=representation" } })).j, []);
  });

  await t.test("recensioni: tutti leggono, nessuno scrive senza account", async () => {
    assert.equal((await req("GET", "/rest/v1/reviews?trail_id=eq.prova-1&select=voto")).j.length, 1);
    assert.ok([401, 403].includes((await req("POST", "/rest/v1/reviews", { body: [{ user_id: A.id, trail_id: "x", voto: 1 }] })).s));
    const r = await req("GET", "/rest/v1/dogs?select=*");
    assert.ok(!(Array.isArray(r.j) && r.j.length), "senza account non si vedono i cani");
  });

  await t.test("limiti: recensione troppo lunga rifiutata", async () => {
    const r = await req("POST", "/rest/v1/reviews", { token: A.tok, body: [{ user_id: A.id, trail_id: "prova-2", testo: "x".repeat(2100) }] });
    assert.equal(r.s, 400);
  });

  await t.test("contatore delle richieste non accessibile dall'app", async () => {
    const r = await req("GET", "/rest/v1/api_usage?select=*", { token: A.tok });
    assert.ok(r.s >= 400 || (Array.isArray(r.j) && r.j.length === 0));
    const f = await req("POST", "/rest/v1/rpc/api_conta", { token: A.tok, body: { p_chiave: "x", p_secondi: 60, p_limite: 999 } });
    assert.ok(f.s >= 400, "la funzione dei limiti non si può chiamare dall'app");
  });
});

// ---------------- funzioni sul server (nessuna chiamata arriva a Google o a OpenRouteService) ----------------
const fn = (nome, body, origin = SITO, method = "POST") =>
  fetch(`${URL_SB}/functions/v1/${nome}`, { method, headers: { Origin: origin, apikey: PUB, "Content-Type": "application/json" }, body: method === "POST" ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined });

for (const nome of ["ai-chat", "ors-route"]) {
  test(`${nome}: rifiuta siti estranei e accetta quello di AllDogs`, async () => {
    assert.equal((await fn(nome, {}, "https://sito-estraneo.example")).status, 403);
    const o = await fn(nome, null, SITO, "OPTIONS");
    assert.equal(o.status, 204);
    assert.equal(o.headers.get("access-control-allow-origin"), SITO);
  });
  test(`${nome}: rifiuta richieste troppo grandi o non valide`, async () => {
    assert.equal((await fn(nome, "x".repeat(130000))).status, 413);
    assert.equal((await fn(nome, "{non è json")).status, 400);
  });
}
test("ai-chat: accetta solo testo e modelli Gemini", async () => {
  assert.equal((await fn("ai-chat", { model: "gpt-4", req: { contents: [] } })).status, 400);
  assert.equal((await fn("ai-chat", { model: "gemini-x", req: { contents: [{ parts: [{ fileData: { fileUri: "https://x" } }] }] } })).status, 400);
});
test("ors-route: accetta solo punti validi", async () => {
  assert.equal((await fn("ors-route", { coordinates: [["a", 1]] })).status, 400);
  assert.equal((await fn("ors-route", { coordinates: Array(60).fill([14, 40]) })).status, 400);
});
