// Chat AI di AllDogs: l'app manda la conversazione, qui si aggiunge la chiave Gemini (segreto sul server) e si inoltra a Google.
import { cors, limiti, risposta } from "../_shared/comune.ts";

const CHIAVE = Deno.env.get("GEMINI_API_KEY") || "";
const MODELLO_OK = /^gemini-[a-z0-9.\-]{1,40}$/;
const MAX_BYTE = 120_000;

Deno.serve(async (req) => {
  const h = cors(req);
  if (!h) return new Response("origine non ammessa", { status: 403 });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return risposta({ error: { message: "solo POST" } }, 405, h);
  if (!CHIAVE) return risposta({ error: { message: "chiave Gemini non configurata sul server" } }, 503, h);

  const testo = await req.text();
  if (testo.length > MAX_BYTE) return risposta({ error: { message: "richiesta troppo grande" } }, 413, h);
  let b: { model?: string; req?: Record<string, unknown> };
  try { b = JSON.parse(testo); } catch { return risposta({ error: { message: "JSON non valido" } }, 400, h); }
  const model = String(b.model || "");
  const r = b.req;
  if (!MODELLO_OK.test(model) || !r || typeof r !== "object" || !Array.isArray(r.contents) || r.contents.length > 60) {
    return risposta({ error: { message: "richiesta non valida" } }, 400, h);
  }

  try {
    const no = await limiti("ai", req, { oraUtente: 60, oraIp: 25, giornoTutti: 1500 });
    if (no) return risposta({ error: { message: no } }, 429, { ...h, "Retry-After": "600" });
  } catch {
    return risposta({ error: { message: "servizio non disponibile" } }, 503, h);
  }

  // solo testo: niente strumenti, file o altri campi; risposta di lunghezza limitata
  const soloTesto = (x: unknown) => {
    const c = x as { role?: unknown; parts?: unknown };
    if (!c || !Array.isArray(c.parts) || c.parts.length < 1 || c.parts.length > 4) return null;
    const parts = c.parts.map((p) => (p && typeof (p as { text?: unknown }).text === "string" ? { text: (p as { text: string }).text } : null));
    if (parts.some((p) => !p)) return null;
    const role = c.role === "model" ? "model" : c.role === "user" || c.role === undefined ? "user" : null;
    return role ? { role, parts } : null;
  };
  const contents = (r.contents as unknown[]).map(soloTesto);
  const sys = r.systemInstruction ? soloTesto(r.systemInstruction) : null;
  if (contents.some((c) => !c) || (r.systemInstruction && !sys)) return risposta({ error: { message: "richiesta non valida" } }, 400, h);
  const gc = (r.generationConfig || {}) as Record<string, unknown>;
  const corpo = {
    contents,
    systemInstruction: sys ? { parts: sys.parts } : undefined,
    generationConfig: {
      responseMimeType: gc.responseMimeType === "application/json" ? "application/json" : undefined,
      responseSchema: gc.responseSchema && typeof gc.responseSchema === "object" ? gc.responseSchema : undefined,
      temperature: typeof gc.temperature === "number" ? Math.min(1.5, Math.max(0, gc.temperature)) : undefined,
      maxOutputTokens: 4096,
    },
  };
  const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": CHIAVE },
    body: JSON.stringify(corpo),
    signal: AbortSignal.timeout(25_000),
  }).catch(() => null);
  if (!g) return risposta({ error: { message: "il servizio non ha risposto in tempo" } }, 504, h);
  // errori di Google: all'app arriva solo il codice, mai i dettagli (configurazione, chiave)
  if (!g.ok) return risposta({ error: { message: g.status === 429 ? "servizio occupato" : "servizio non disponibile" } }, g.status === 429 || g.status === 503 || g.status === 500 ? g.status : 502, h);
  return risposta(await g.text(), 200, h);
});
