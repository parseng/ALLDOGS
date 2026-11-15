// Parti comuni alle funzioni di AllDogs: CORS, limiti d'uso, chi sta chiamando.
const ORIGINI = [/^https:\/\/parseng\.github\.io$/, /^http:\/\/localhost(:\d+)?$/, /^http:\/\/127\.0\.0\.1(:\d+)?$/];

export function cors(req: Request): Record<string, string> | null {
  const o = req.headers.get("origin") || "";
  if (!ORIGINI.some((r) => r.test(o))) return null;
  return {
    "Access-Control-Allow-Origin": o,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

export function risposta(body: unknown, status: number, h: Record<string, string>): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: { ...h, "Content-Type": "application/json" },
  });
}

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const SERVIZIO = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PUBBLICA = Deno.env.get("SUPABASE_ANON_KEY")!;

async function sha(s: string): Promise<string> {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s + "|alldogs"));
  return [...new Uint8Array(b)].slice(0, 12).map((x) => x.toString(16).padStart(2, "0")).join("");
}

// utente collegato (se il token è valido) oppure indirizzo IP (salvato solo come impronta, non in chiaro)
export async function chi(req: Request): Promise<{ id: string; utente: boolean }> {
  const a = req.headers.get("authorization") || "";
  const tok = a.startsWith("Bearer ") ? a.slice(7) : "";
  if (tok.split(".").length === 3) {
    try {
      const r = await fetch(URL_SB + "/auth/v1/user", { headers: { apikey: PUBBLICA, Authorization: "Bearer " + tok } });
      if (r.ok) {
        const u = await r.json();
        if (u && u.id) return { id: "user:" + u.id, utente: true };
      }
    } catch (_) { /* si passa all'IP */ }
  }
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "sconosciuto";
  return { id: "ip:" + (await sha(ip)), utente: false };
}

// true = si può procedere; false = limite superato
export async function conta(chiave: string, secondi: number, limite: number): Promise<boolean> {
  const r = await fetch(URL_SB + "/rest/v1/rpc/api_conta", {
    method: "POST",
    headers: { apikey: SERVIZIO, Authorization: "Bearer " + SERVIZIO, "Content-Type": "application/json" },
    body: JSON.stringify({ p_chiave: chiave, p_secondi: secondi, p_limite: limite }),
  });
  if (!r.ok) throw new Error("contatore non disponibile");
  return (await r.json()) === true;
}

// controlla tutti i limiti; restituisce un messaggio se uno è superato
export async function limiti(servizio: string, req: Request, l: { oraUtente: number; oraIp: number; giornoTutti: number }): Promise<string | null> {
  const c = await chi(req);
  if (!(await conta(`${servizio}:${c.id}`, 3600, c.utente ? l.oraUtente : l.oraIp))) return "troppe richieste in un'ora";
  if (!(await conta(`${servizio}:tutti`, 86400, l.giornoTutti))) return "limite giornaliero dell'app raggiunto";
  return null;
}
