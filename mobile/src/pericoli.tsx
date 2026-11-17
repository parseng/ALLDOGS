// Pericoli segnalati dagli utenti lungo i percorsi (buca, vetri, esche, animale aggressivo...).
// Stanno su Supabase (tabella hazards): li vede chiunque, li scrive chi ha l'account. Sulla mappa: triangolino giallo.
import React, { useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { C, F } from "./theme";
import { aOgniAvvio, motore, notifica, pagina } from "./motore";
import { nav } from "./nav";
import { Bottone, Chip, Testo } from "./ui/base";
import { strati } from "./ui/strati";

export const TIPI: [string, string][] = [
  ["buca", "Buca o fossa"], ["vetri", "Vetri o cose taglienti"], ["esche", "Bocconi o esche sospette"], ["animale", "Animale aggressivo"],
  ["frana", "Sentiero franato o chiuso"], ["acqua", "Acqua alta o fango"], ["caldo", "Asfalto rovente"], ["altro", "Altro pericolo"],
];
const nomeTipo = (k: string) => (TIPI.find((t) => t[0] === k) || TIPI[TIPI.length - 1])[1];
const GIORNI = 30;

let elenco: any[] = [];
let segni: any[] = [];
let ultimo: { c: number[]; t: number } | null = null;

function quando(t: string) {
  const g = Math.floor((Date.now() - new Date(t).getTime()) / 864e5);
  return g <= 0 ? "oggi" : g === 1 ? "ieri" : `${g} giorni fa`;
}

/** disegna i triangolini sulla mappa (toglie quelli vecchi) */
function disegna() {
  const M = motore();
  try {
    const amb: any = pagina().amb, mapa = M.M;
    if (!mapa || !amb.mapboxgl) return;
    segni.forEach((s) => { try { s.remove(); } catch {} });
    segni = elenco.map((h) => {
      const el = amb.document.createElement("div");
      el.className = "mk-haz";
      el.innerHTML = "<b>!</b>";
      el.onclick = () => mostra(h);
      return new amb.mapboxgl.Marker({ element: el, anchor: "bottom" }).setLngLat([h.lng, h.lat]).addTo(mapa);
    });
  } catch (e) { console.warn("pericoli: disegno", e); }
}

function mostra(h: any) {
  const M = motore();
  const mio = M.SY && M.SY.user && M.SY.user.id === h.user_id;
  const testo = `Segnalato ${quando(h.creato_il)}.${h.nota ? "\n\n«" + h.nota + "»" : ""}\n\nPasso con attenzione e tengo il cane vicino.`;
  Alert.alert(nomeTipo(h.tipo), testo, mio
    ? [{ text: "Chiudi", style: "cancel" }, { text: "Non c'è più: toglilo", style: "destructive", onPress: () => togli(h) }]
    : [{ text: "Ok" }]);
}

async function togli(h: any) {
  try {
    const sb = await motore().sbLoad();
    const { error } = await sb.from("hazards").delete().eq("id", h.id);
    if (error) throw error;
    elenco = elenco.filter((x) => x.id !== h.id); disegna(); strati.avviso("Segnalazione tolta");
  } catch { strati.avviso("Non riesco a toglierla adesso: riprova più tardi."); }
}

/** carica i pericoli intorno a un punto [lat, lng] (circa 25 km), al massimo una volta ogni 30 secondi per la stessa zona */
export async function caricaPericoli(c: number[], forza = false) {
  if (!c || c.length < 2) return;
  const M = motore();
  if (!forza && ultimo && Date.now() - ultimo.t < 30000 && M.hav(ultimo.c, c) < 8000) return;
  ultimo = { c, t: Date.now() };
  try {
    const sb = await M.sbLoad();
    const da = new Date(Date.now() - GIORNI * 864e5).toISOString();
    const { data, error } = await sb.from("hazards").select("id,lat,lng,tipo,nota,creato_il,user_id")
      .gte("creato_il", da).gte("lat", c[0] - 0.25).lte("lat", c[0] + 0.25).gte("lng", c[1] - 0.35).lte("lng", c[1] + 0.35)
      .order("creato_il", { ascending: false }).limit(300);
    if (error) throw error;
    elenco = data || [];
    disegna();
  } catch (e) { console.warn("pericoli: caricamento", e); }
}

/** pericoli vicini a un percorso (entro 40 m dalla linea): per avvisare prima di partire */
export function pericoliVicini(path: number[][]): any[] {
  const M = motore();
  if (!path || !path.length) return [];
  return elenco.filter((h) => path.some((p, i) => i % 3 === 0 && M.hav(p, [h.lat, h.lng]) < 40));
}

function Modulo({ pos }: { pos: number[] }) {
  const [tipo, setTipo] = useState<string>("");
  const [nota, setNota] = useState("");
  const [invio, setInvio] = useState(false);
  const manda = async () => {
    if (!tipo) { strati.avviso("Scegli che tipo di pericolo è."); return; }
    setInvio(true);
    try {
      const M = motore(), sb = await M.sbLoad();
      const { data, error } = await sb.from("hazards").insert({ lat: pos[0], lng: pos[1], tipo, nota: nota.trim().slice(0, 300) || null }).select().single();
      if (error) throw error;
      elenco = [data, ...elenco]; disegna(); notifica();
      strati.chiudiFoglio(); strati.avviso("Grazie! Gli altri utenti lo vedranno sulla mappa per 30 giorni.");
    } catch { setInvio(false); strati.avviso("Non riesco a mandare la segnalazione: controlla la connessione e riprova."); }
  };
  return (
    <View>
      <Testo tipo="secondo">Lo segno nel punto dove sei adesso. Gli altri lo vedranno sulla mappa con un triangolino giallo.</Testo>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 10 }}>
        {TIPI.map(([k, t]) => <Chip key={k} piccolo testo={t} attivo={tipo === k} onPress={() => setTipo(k)} style={{ marginRight: 6, marginTop: 6 }} />)}
      </View>
      <Text style={{ fontFamily: F.t700, fontSize: 14, color: C.ink, marginTop: 14 }}>Vuoi aggiungere qualcosa? (facoltativo)</Text>
      <TextInput value={nota} onChangeText={setNota} maxLength={300} multiline placeholder="Es. buca profonda a destra dopo il ponte" placeholderTextColor={C.ink2}
        style={{ minHeight: 72, marginTop: 6, borderRadius: 14, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.sage2, padding: 12, fontFamily: F.t600, fontSize: 15, color: C.ink, textAlignVertical: "top" }} />
      <Bottone testo={invio ? "Mando…" : "Segnala qui"} icona="alert" tinta="scuro" largo disabled={invio} style={{ marginTop: 14 }} onPress={manda} />
    </View>
  );
}

/** apre la scheda per segnalare un pericolo nel punto pos [lat, lng] (o dove sei) */
export async function segnalaPericolo(pos?: number[] | null) {
  const M = motore();
  if (!(M.SY && M.SY.user)) {
    Alert.alert("Serve l'account", "Per segnalare un pericolo devi entrare con il tuo account: così le segnalazioni restano affidabili per tutti.", [
      { text: "Annulla", style: "cancel" }, { text: "Entra o registrati", onPress: () => nav.apri("account") },
    ]);
    return;
  }
  let p = pos;
  if (!p) { try { p = await M.getPos(); } catch { strati.avviso("Non riesco a leggere la posizione: attiva il GPS e riprova."); return; } }
  strati.foglio({ titolo: "Segnala un pericolo", corpo: () => <Modulo pos={p!} /> });
}

// quando la mappa si sposta, carico i pericoli della zona
aOgniAvvio((M: any) => {
  ultimo = null; elenco = []; segni = [];
  const vista = M.refreshView;
  if (typeof vista === "function") M.refreshView = (...a: any[]) => { const r = vista(...a); try { caricaPericoli(M.S.view.c); } catch {} return r; };
  setTimeout(() => { try { caricaPericoli(M.S.view.c, true); } catch {} }, 4000);
});
