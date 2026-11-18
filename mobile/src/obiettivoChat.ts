// "Creami un calendario: oggi fa 3 km, entro un mese 5 km" scritto all'assistente: l'app crea davvero il calendario
// degli Obiettivi (con le stesse regole prudenti del modulo a mano) e risponde con quello che ha fatto.
import { aOgniAvvio, motore, notifica, pagina } from "./motore";

const NUM: Record<string, number> = { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, dodici: 12 };
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const GIORNI: Record<string, number> = { domenica: 0, lunedi: 1, "lunedì": 1, martedi: 2, "martedì": 2, mercoledi: 3, "mercoledì": 3, giovedi: 4, "giovedì": 4, venerdi: 5, "venerdì": 5, sabato: 6 };
const n = (x: string) => (/\d/.test(x) ? parseFloat(x.replace(",", ".")) : NUM[x] || 0);

/** cosa chiede il messaggio: km di oggi, km da raggiungere, data di arrivo, giorno della passeggiata lunga (oppure null) */
export function leggiRichiesta(testo: string): { da: number; a: number; fine: Date; dow?: number } | null {
  const t = testo.toLowerCase().replace(/’/g, "'");
  const vuole = /\b(crea|creami|fammi|fai|prepara|preparami|imposta|genera|organizza|metti|voglio|vorrei)\b/.test(t) && /\b(calendario|programma|piano|obiettivo|allenamento)\b/.test(t);
  if (!vuole) return null;
  let da = 0, a = 0;
  const m1 = t.match(/da\s+(\d+(?:[.,]\d+)?)\s*(?:km|chilometri)?\s+(?:a|fino a)\s+(\d+(?:[.,]\d+)?)\s*(?:km|chilometri)?/);
  if (m1) { da = n(m1[1]); a = n(m1[2]); }
  else {
    const km = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:km|chilometri)/g)].map((m) => n(m[1]));
    if (km.length >= 2) { da = km[0]; a = km[km.length - 1]; }
  }
  if (!(da > 0 && a > 0)) return null;
  const oggi = new Date(); oggi.setHours(12, 0, 0, 0);
  let fine: Date | null = null;
  const m2 = t.match(/(?:entro|in|tra|fra)\s+(?:un|una|uno|\d+|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|dodici)?\s*(mese|mesi|settimana|settimane|giorni)/);
  if (m2) {
    const q = t.match(/(?:entro|in|tra|fra)\s+(un|una|uno|\d+|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|dodici)?\s*(mese|mesi|settimana|settimane|giorni)/)!;
    const k = q[1] ? n(q[1]) : 1, u = q[2];
    fine = new Date(oggi.getTime() + (u.startsWith("mes") ? k * 30 : u.startsWith("settiman") ? k * 7 : k) * 864e5);
  }
  const m3 = t.match(/(?:entro il|per il|il)\s+(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/);
  if (m3) {
    const d = new Date(oggi.getFullYear(), MESI.indexOf(m3[2]), +m3[1], 12);
    if (d < oggi) d.setFullYear(d.getFullYear() + 1);
    fine = d;
  }
  if (!fine) fine = new Date(oggi.getTime() + 42 * 864e5); // senza una data: sei settimane
  const g = Object.keys(GIORNI).find((x) => new RegExp("\\b" + x + "\\b").test(t));
  return { da, a, fine, dow: g != null ? GIORNI[g] : undefined };
}

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

/** crea il calendario come se avessi compilato il modulo; restituisce la risposta da mostrare nella chat */
export function creaCalendario(r: { da: number; a: number; fine: Date; dow?: number }): string {
  const M = motore(), el = (id: string) => pagina().el(id);
  try {
    if (M.GOAL) M.S.goalEdit = true;
    M.S.goalDraft = null;
    M.showGoals();
    const f = el("g-from"), to = el("g-to"), dt = el("g-date"), dw = el("g-dow"), mk = el("g-make"), er = el("g-err");
    if (!f || !to || !dt || !mk || typeof mk.onclick !== "function") return "";
    f.value = String(r.da).replace(".", ","); to.value = String(r.a).replace(".", ","); dt.value = iso(r.fine);
    if (r.dow != null && dw) dw.value = String(r.dow);
    if (er) { er.hidden = true; er.textContent = ""; }
    mk.onclick({ preventDefault() {}, stopPropagation() {} });
    if (er && !er.hidden && er.textContent) return `Non posso crearlo così: ${er.textContent} Dimmi pure come cambiarlo.`;
    const G = M.GOAL;
    if (!G) return "";
    let fineT = G.end;
    try { const P = M.goalNow(G, M.dog(), M.dogKind(M.dog())); if (P && P.end) fineT = P.end; } catch {}
    const fineVera = new Date(fineT).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
    const nome = (M.dog() && M.dog().name) || "il tuo cane";
    const spostata = fineT - r.fine.getTime() > 2 * 864e5;
    return `Fatto! Ho creato il calendario per ${nome}: da ${String(G.from).replace(".", ",")} a ${String(G.target).replace(".", ",")} km, entro il ${fineVera}.` +
      (spostata ? " Ho allungato un po' i tempi: aumentare troppo in fretta rischia di fargli male." : "") +
      " Lo trovi in Allenati, negli Obiettivi: ogni giorno ti dico cosa fare.";
  } catch (e) { console.warn("obiettivo dalla chat:", e); return ""; }
}

aOgniAvvio((M: any) => {
  // chat dell'allenatore (Allenati) e assistente di Crea giro
  const mini = M.miniSend;
  M.miniSend = (id: string, testo: string) => {
    const r = leggiRichiesta(String(testo || ""));
    const c = M.MC && M.MC[id];
    if (r && c && !c.busy) {
      const risposta = creaCalendario(r);
      if (risposta) { c.msgs.push({ r: "u", t: String(testo).trim() }, { r: "a", t: risposta }); try { M.miniRender(id); } catch {} notifica(); return Promise.resolve(); }
    }
    return mini(id, testo);
  };
  const chat = M.chatSend;
  M.chatSend = (testo: string) => {
    const r = leggiRichiesta(String(testo || ""));
    if (r && !M.S.busy) {
      const risposta = creaCalendario(r);
      if (risposta) { M.S.chat.push({ r: "u", t: String(testo).trim() }, { r: "a", t: risposta }); try { M.renderChat(); } catch {} notifica(); return Promise.resolve(); }
    }
    return chat(testo);
  };
});
