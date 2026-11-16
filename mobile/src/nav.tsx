// Navigazione dell'app: 5 sezioni nel menu in basso e, sopra, una pila di schermate (scheda sentiero, salute…).
// Resta allineata con il motore: il motore ragiona a "pagine" come il sito (#esplora, #s-123, #vai…).
import { useSyncExternalStore } from "react";
import { motore, pagina, quandoCambiaPagina } from "./motore";

export type Sezione = "esplora" | "attivita" | "crea" | "allenati" | "cane";
export type Schermata = { nome: string; arg?: any };

/** schermate a tutto schermo: senza barra del menu e senza mascotte che sbuca */
export const PIENE = new Set(["vai", "cerca", "filtri", "volo", "modifica", "primo", "segui", "uscita", "mappa"]);

const st = { sezione: "esplora" as Sezione, pila: [] as Schermata[], allenati: "obiettivi" as "obiettivi" | "addestramento", attivita: "diary" as "diary" | "saved" | "off", v: 0 };
const iscritti = new Set<() => void>();
const cambia = () => { st.v++; iscritti.forEach((f) => f()); };
export function useNav() {
  useSyncExternalStore((f) => (iscritti.add(f), () => void iscritti.delete(f)), () => st.v);
  return st;
}
export const cima = (): Schermata => st.pila[st.pila.length - 1] || { nome: st.sezione };

// schermata dell'app → pagina del motore
function hashDi(s: Schermata): string | null {
  switch (s.nome) {
    case "esplora": case "crea": case "attivita": case "cane": case "salute": case "zaino": case "soccorso": case "regole": case "vai": return s.nome;
    case "allenati": return st.allenati;
    case "sentiero": return "s-" + s.arg;
    case "uscita": return "u-" + s.arg;
    default: return null; // ricerca, filtri, impostazioni…: per il motore non cambia pagina
  }
}
function allinea() {
  const h = hashDi(cima()) || hashDi({ nome: st.sezione });
  try { if (h && motore() && motore().S.dog) pagina().vaiA(h); } catch (e) { console.warn("nav:", e); }
}

export const nav = {
  sezione(s: Sezione) { if (st.sezione === s && !st.pila.length) return; st.sezione = s; st.pila = []; cambia(); allinea(); },
  apri(nome: string, arg?: any) { const c = cima(); if (c.nome === nome && c.arg === arg) return; st.pila = [...st.pila, { nome, arg }]; cambia(); allinea(); },
  sostituisci(nome: string, arg?: any) { st.pila = [...st.pila.slice(0, -1), { nome, arg }]; cambia(); allinea(); },
  indietro(): boolean {
    if (st.pila.length) { st.pila = st.pila.slice(0, -1); cambia(); allinea(); return true; }
    if (st.sezione !== "esplora") { st.sezione = "esplora"; cambia(); allinea(); return true; }
    return false;
  },
  allenati(v: "obiettivi" | "addestramento") { if (st.allenati === v) return; st.allenati = v; cambia(); allinea(); },
  attivita(v: "diary" | "saved" | "off") { if (st.attivita === v) return; st.attivita = v; cambia(); },
  /** il motore ha cambiato pagina da solo (es. dopo aver creato un giro): l'app lo segue */
  daMotore(h: string) {
    const ora = hashDi(cima());
    if (h === ora) return;
    const m = /^s-(\d+)$/.exec(h), u = /^u-(\d+)$/.exec(h);
    if (m) { st.pila = [...st.pila.filter((x) => x.nome !== "sentiero"), { nome: "sentiero", arg: +m[1] }]; }
    else if (u) { st.pila = [...st.pila, { nome: "uscita", arg: +u[1] }]; }
    else if (h === "vai") { st.pila = [...st.pila.filter((x) => x.nome !== "vai"), { nome: "vai" }]; }
    else if (h === "obiettivi" || h === "addestramento" || h === "allenati") { st.sezione = "allenati"; if (h !== "allenati") st.allenati = h; st.pila = []; }
    else if (h === "salvati") { st.sezione = "attivita"; st.attivita = "saved"; st.pila = []; }
    else if (["esplora", "crea", "attivita", "cane"].includes(h)) { st.sezione = h as Sezione; st.pila = []; }
    else if (["salute", "zaino", "soccorso", "regole"].includes(h)) { st.sezione = "cane"; st.pila = [{ nome: h }]; }
    else return;
    cambia();
  },
};
quandoCambiaPagina((h) => nav.daMotore(h));
