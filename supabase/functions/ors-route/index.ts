// Calcolo dei percorsi a piedi di AllDogs: si inoltra a OpenRouteService con la chiave salvata sul server.
import { cors, limiti, risposta } from "../_shared/comune.ts";

const CHIAVE = Deno.env.get("ORS_API_KEY") || "";
const MAX_BYTE = 20_000;
const MAX_PUNTI = 50;

Deno.serve(async (req) => {
  const h = cors(req);
  if (!h) return new Response("origine non ammessa", { status: 403 });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return risposta({ error: { message: "solo POST" } }, 405, h);
  if (!CHIAVE) return risposta({ error: { message: "chiave OpenRouteService non configurata sul server" } }, 503, h);

  const testo = await req.text();
  if (testo.length > MAX_BYTE) return risposta({ error: { message: "richiesta troppo grande" } }, 413, h);
  let b: { coordinates?: unknown };
  try { b = JSON.parse(testo); } catch { return risposta({ error: { message: "JSON non valido" } }, 400, h); }
  const c = b.coordinates;
  if (!Array.isArray(c) || c.length < 1 || c.length > MAX_PUNTI ||
    !c.every((p) => Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === "number" && isFinite(x)))) {
    return risposta({ error: { message: "punti non validi" } }, 400, h);
  }

  try {
    const no = await limiti("ors", req, { oraUtente: 120, oraIp: 60, giornoTutti: 1800 });
    if (no) return risposta({ error: { message: no } }, 429, { ...h, "Retry-After": "600" });
  } catch {
    return risposta({ error: { message: "servizio non disponibile" } }, 503, h);
  }

  const r = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking/geojson", {
    method: "POST",
    headers: { Authorization: CHIAVE, "Content-Type": "application/json", Accept: "application/geo+json, application/json" },
    body: testo,
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
  if (!r) return risposta({ error: { message: "il servizio non ha risposto in tempo" } }, 504, h);
  if (r.ok) return risposta(await r.text(), 200, h);
  // 400/404: punto non raggiungibile a piedi (l'app lo spiega); il resto senza dettagli
  if (r.status === 400 || r.status === 404) {
    let code = 0;
    try { code = (await r.json())?.error?.code || 0; } catch { /* niente */ }
    return risposta({ error: { message: "percorso non trovato", code } }, r.status, h);
  }
  return risposta({ error: { message: r.status === 429 ? "limite del servizio raggiunto" : "servizio non disponibile" } }, r.status === 429 ? 429 : 502, h);
});
