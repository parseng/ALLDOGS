// Collegamenti tra il motore e le parti native che il sito faceva "da browser":
// finestrelle, foto, schermo acceso. Si applicano ogni volta che il motore viene creato.
import "react-native-url-polyfill/auto";
import React from "react";
import { createClient } from "@supabase/supabase-js";
import { archivio } from "./archivio";
import { usaSupabase } from "./motore";
import { aOgniAvvio, notifica, pagina, pulito, useMotore } from "./motore";
import { fotoMetti, fotoPrendi } from "./foto";
import { PaginaMotore } from "./ui/PaginaMotore";
import { strati } from "./ui/strati";

// account: la stessa libreria del sito, con la sessione salvata nella memoria dell'app
usaSupabase({ createClient: (url: string, key: string, o: any) => createClient(url, key, { ...o, auth: { ...(o && o.auth), storage: archivio, detectSessionInUrl: false } }) });

// la finestrella del sito (#sheet) diventa una tendina dell'app che resta "viva": i suoi bottoni funzionano
function CorpoFinestrella() {
  useMotore();
  const box = pagina().el("sheet-box");
  if (pagina().el("sheet").hidden) setTimeout(() => strati.chiudiFoglio(), 0);
  return <PaginaMotore id="sheet-box" senzaTitolo togli={["#sheet-x", "#sheet-xx", ".shx"]} />;
}

aOgniAvvio((M) => {
  const apri = M.openSheet;
  M.openSheet = (html: string) => {
    apri(html); // il sito scrive la finestrella e collega i suoi bottoni
    const sheet = pagina().el("sheet");
    sheet.hidden = false;
    const h2 = pagina().el("sheet-box").querySelector("h2");
    strati.foglio({ titolo: h2 ? pulito(h2.textContent).trim() : "AllDogs", pieno: true, corpo: () => <CorpoFinestrella />, alChiudere: () => { sheet.hidden = true; notifica(); } });
  };
  // percorso verso una meta: se è più lungo del tempo chiesto, lo dico chiaramente (la meta non si può accorciare)
  const versoMeta = M.toRoute;
  M.toRoute = async (o: any) => {
    const prima = M.S.gen;
    await versoMeta(o);
    const r = M.S.gen && M.S.gen !== prima ? M.S.gen[0] : null;
    const ultimo = [...M.S.chat].reverse().find((m: any) => m.r === "u");
    const voluti = (o && +o.minutes) || (ultimo ? M.askedMins(ultimo.t) : 0);
    if (!r || !voluti) return;
    const minuti = Math.round((r.len / 1000) * M.pace());
    if (minuti > voluti * 1.2) {
      M.S.chat.push({ r: "a", local: true, t: `Attenzione: andare fino a lì e tornare sono ${M.km(r.len)} km, circa ${M.fmtDur(minuti * 60000)} con ${M.dog().name || "il cane"}, più dei ${voluti} minuti che volevi. Con la meta non posso accorciarlo: scegli un posto più vicino, oppure scrivimi «anello di ${voluti} minuti qui vicino».` });
      try { M.renderChat(); } catch {}
      notifica();
    }
  };
  // durata scritta a parole: "due ore", "un'ora e mezza", "tre quarti d'ora", "1 ora e 30"
  const minutiDi = M.askedMins;
  const NUM: Record<string, number> = { un: 1, una: 1, uno: 1, due: 2, tre: 3, quattro: 4, cinque: 5, venti: 20, trenta: 30, quaranta: 40, cinquanta: 50, quindici: 15, dieci: 10 };
  const parla = (testo: string): number => {
    const t = String(testo || "").toLowerCase().replace(/’/g, "'");
    if (/tre quarti d'?ora/.test(t)) return 45;
    if (/quarto d'?ora/.test(t)) return 15;
    const m = t.match(/\b(un|una|due|tre|quattro|cinque|\d+(?:[.,]\d)?)\s*'?\s*(?:ore|ora|h)\b(?:\s*e\s*(mezz|un quarto|\d+|trenta|quindici|venti|quaranta))?/);
    if (m) {
      const h = /\d/.test(m[1]) ? parseFloat(m[1].replace(",", ".")) : NUM[m[1]] || 0;
      const x = m[2] ? (m[2] === "mezz" ? 30 : m[2] === "un quarto" ? 15 : /\d/.test(m[2]) ? +m[2] : NUM[m[2]] || 0) : 0;
      if (h) return Math.round(h * 60 + x);
    }
    const mm = t.match(/\b(dieci|quindici|venti|trenta|quaranta|cinquanta)\s*minut/);
    if (mm) return NUM[mm[1]];
    return minutiDi(testo);
  };
  M.askedMins = parla;
  // il motore punta al tempo chiesto col solo passo del cane, ma poi soste e salite allungano la stima di circa un quinto:
  // punto un po' più corto, così la durata mostrata torna vicina a quella chiesta. Se nella chat c'è scritta una durata, vale quella.
  const genera = M.generate;
  // se il servizio dei percorsi è fuori uso, lo dico chiaro (il testo del sito parlava di chiave da controllare)
  const spiegaGuasto = () => {
    try {
      const out = pagina().el("gen-out");
      if (out && /chiave di OpenRouteService/.test(out.textContent || "")) { out.innerHTML = `<div class="note warn">Il servizio che calcola i percorsi (OpenRouteService) in questo momento non risponde. Non dipende da te: riprova tra qualche minuto. Intanto puoi scegliere uno dei sentieri della mappa.</div>`; notifica(); }
    } catch {}
  };
  M.generate = (o: any) => {
    if (o && o.mins) {
      let m = +o.mins;
      if (o.source === "chat") { const u = [...(M.S.chat || [])].reverse().find((x: any) => x.r === "u"); const det = u ? parla(u.t) : 0; if (det) m = Math.max(10, Math.min(180, det)); }
      o = { ...o, mins: Math.max(10, Math.round(m * 0.82)) };
    }
    const r = genera(o);
    Promise.resolve(r).finally(() => setTimeout(spiegaGuasto, 50));
    return r;
  };
  // il modulo "dati del cane" del sito non conosce il sesso: quando salva, lo tengo
  const salvaVero = M.store.set;
  M.store.set = (k: string, v: any) => {
    if (k === "alldogs-dog" && v && typeof v === "object" && v.sex == null) {
      const prima = M.store.get(k);
      if (prima && prima.sex) { const nuovo = { ...v, sex: prima.sex }; if (M.S.dog === v) M.S.dog = nuovo; v = nuovo; }
    }
    return salvaVero.call(M.store, k, v);
  };
  // peso tipico secondo il sesso: i maschi stanno nella parte alta della fascia della razza, le femmine in quella bassa
  const fasciaRazza = M.breedRange;
  M.breedRange = (d: any) => {
    const r = fasciaRazza(d);
    if (!r || !d || (d.sex !== "m" && d.sex !== "f")) return r;
    const tondo = (x: number) => Math.round(x * 2) / 2, ampia = r.max - r.min;
    return d.sex === "m" ? { ...r, min: tondo(r.min + ampia * 0.3) } : { ...r, max: tondo(r.max - ampia * 0.3) };
  };
  // foto sul telefono al posto del magazzino del browser
  M.photoPut = (k: string, v: string | null) => fotoMetti(String(k), v);
  M.photoGet = (k: string) => fotoPrendi(String(k));
  // parti che nel sito sistemano la pagina: qui non servono
  for (const n of ["navCompass", "navSizes", "wakeOn", "aiBottom", "syncPhoto", "syncTabDog"]) { try { M[n] = () => {}; } catch {} }
});
