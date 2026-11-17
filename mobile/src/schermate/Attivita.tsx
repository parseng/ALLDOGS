// Attività: diario delle uscite (con mappa, andatura e passi), percorsi salvati e mappe scaricate.
import React, { useEffect, useState } from "react";
import { Alert, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import { C, F, MARGINE, R, TESTATA } from "../theme";
import { motore, pulito, useMotore } from "../motore";
import { nav, useNav } from "../nav";
import { fotoMetti, fotoPrendi, scegliFoto } from "../foto";
import { Bottone, BottoneTondo, Chip, Icona, Segmenti, Sezione, Testo, Tocco } from "../ui/base";
import { nomeCane } from "../ui/BarraMenu";
import { PaginaGrande } from "../ui/Testate";
import { CartaSentiero, Foto, Vuoto } from "../ui/sentieri";
import { strati } from "../ui/strati";
import { foglioScarica, listaScaricate } from "../offline";
import { partiCon } from "./Sentiero";

const UMORI: [string, string][] = [["ok", "Benissimo"], ["tired", "Stanco"], ["bad", "Ha avuto problemi"]];
const SALUTE = "Sull'iPhone apri l'app Salute, tocca Sfoglia → Attività → Passi, scegli G (giorno) e somma le barre delle ore della passeggiata. Su Android guarda in Google Fit o Health Connect.";

function FotoSalvata({ chiave, style }: { chiave: string; style: any }) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => { let vivo = true; fotoPrendi(chiave).then((x) => vivo && setU(x)); return () => { vivo = false; }; }, [chiave]);
  return u ? <Image source={{ uri: u }} style={style} contentFit="cover" /> : null;
}

/** "Com'è andata?": umore del cane, domande veloci sul percorso, note e una foto */
export function apriDiario(i: number, dopo?: () => void) {
  const M = motore(), x = M.S.acts[i];
  if (!x) return;
  strati.foglio({ titolo: "Com'è andata?", sotto: `${x.name} · ${new Date(x.t).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} · ${M.km(x.dist)} km`, pieno: true, corpo: () => <Diario i={i} />, alChiudere: dopo });
}
function Diario({ i }: { i: number }) {
  const M = motore(), x = M.S.acts[i], nome = nomeCane(), sentiero = x.kind === "trail" && x.id;
  const [umore, setUmore] = useState<string>(x.mood || "");
  const [q, setQ] = useState<Record<string, number | undefined>>({ ...(x.q || {}) });
  const [nota, setNota] = useState<string>(x.note || "");
  const [foto, setFoto] = useState<string | null | undefined>(undefined); // undefined = non toccata
  const [nelRec, setNelRec] = useState(!x.phRev);
  const salva = async () => {
    x.mood = umore || undefined;
    x.note = nota.trim().slice(0, 600) || undefined;
    const qq: any = {};
    Object.keys(q).forEach((k) => { if (q[k] === 0 || q[k] === 1) qq[k] = q[k]; });
    x.q = Object.keys(qq).length ? qq : undefined;
    if (sentiero) {
      const all = M.store.get("alldogs-reviews") || {}, r = all[x.id] || {};
      let cambiato = false;
      if (x.q) { r.q = Object.assign({}, r.q, x.q); cambiato = true; }
      if (nelRec && !x.phRev && x.photos && x.photos.length) { r.ph = (r.ph || []).concat(x.photos.map((o: any) => o.k)).slice(-12); r.pos = r.pos || {}; x.photos.forEach((o: any) => { if (o.p) r.pos[o.k] = o.p; }); x.phRev = 1; cambiato = true; }
      if (cambiato) { r.t = r.t || Date.now(); all[x.id] = r; M.store.set("alldogs-reviews", all); }
    }
    if (foto !== undefined) { try { await fotoMetti(String(x.t), foto); x.ph = foto ? 1 : undefined; } catch { strati.avviso("Non c'è spazio per la foto"); } }
    M.store.set("alldogs-acts", M.S.acts);
    strati.chiudiFoglio();
    strati.avviso("Salvato nel diario");
  };
  return (
    <View>
      <Text style={S.h}>Come stava {nome}?</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>{UMORI.map(([k, t]) => <Chip key={k} piccolo sfondo={C.sage} testo={t} attivo={umore === k} onPress={() => setUmore(umore === k ? "" : k)} />)}</View>
      <Text style={[S.h, { marginTop: 14 }]}>Com'era il percorso per {nome}?</Text>
      <Testo tipo="piccolo">Un tocco per risposta, quelle che sai.{sentiero ? " Vanno anche nella recensione del sentiero." : ""}</Testo>
      {M.TQ.map(([k, t]: string[]) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
          <Text style={{ flex: 1, fontFamily: F.t600, fontSize: 14.5, color: C.ink }}>{t}</Text>
          {[[1, "Sì"], [0, "No"]].map(([v, l]) => { const on = q[k] === v; return <Tocco key={String(v)} onPress={() => setQ({ ...q, [k]: on ? undefined : (v as number) })} accessibilityState={{ selected: on }} style={{ minWidth: 48, height: 38, borderRadius: 10, backgroundColor: on ? C.ink : C.sage, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.t800, fontSize: 14, color: on ? C.lime : C.ink }}>{l}</Text></Tocco>; })}
        </View>
      ))}
      {x.photos && x.photos.length ? (
        <>
          <Text style={[S.h, { marginTop: 14 }]}>Foto scattate durante il giro</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{x.photos.map((o: any) => <FotoSalvata key={o.k} chiave={o.k} style={{ width: 84, height: 84, borderRadius: 12 }} />)}</View>
          {sentiero ? <Chip piccolo sfondo={C.sage} testo="Mettile nella recensione del sentiero" attivo={nelRec} onPress={() => setNelRec(!nelRec)} style={{ marginTop: 8 }} /> : null}
        </>
      ) : null}
      <Text style={[S.h, { marginTop: 14 }]}>Note</Text>
      <TextInput multiline value={nota} onChangeText={setNota} placeholder="Es. ha fatto il bagno nel torrente, tanta ombra, attenzione alle mucche" placeholderTextColor={C.ink2} style={{ marginTop: 6, minHeight: 84, borderRadius: 14, backgroundColor: C.sage, padding: 12, fontFamily: F.t600, fontSize: 15, color: C.ink, textAlignVertical: "top" }} />
      <Text style={[S.h, { marginTop: 14 }]}>Una foto</Text>
      {foto ? <Image source={{ uri: foto }} style={{ width: "100%", height: 180, borderRadius: 14, marginTop: 8 }} contentFit="cover" /> : foto === undefined && x.ph ? <FotoSalvata chiave={String(x.t)} style={{ width: "100%", height: 180, borderRadius: 14, marginTop: 8 }} /> : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Bottone testo="Scegli una foto" tinta="chiaro2" piccolo onPress={async () => { const f = await scegliFoto(); if (f) setFoto(f.uri); }} />
        <Bottone testo="Scatta" icona="cam" tinta="chiaro2" piccolo onPress={async () => { const f = await scegliFoto({ camera: true }); if (f) setFoto(f.uri); }} />
        {foto || (foto === undefined && x.ph) ? <Bottone testo="Togli" tinta="chiaro2" piccolo onPress={() => setFoto(null)} /> : null}
      </View>
      <Bottone testo="Salva nel diario" icona="check" largo style={{ marginTop: 16 }} onPress={salva} />
    </View>
  );
}

function foglioPassi(i: number) {
  const M = motore(), x = M.S.acts[i];
  const Corpo = () => {
    const [v, setV] = useState(String(x.steps || ""));
    return (
      <View>
        <TextInput value={v} onChangeText={setV} keyboardType="number-pad" placeholder="Es. 4.500" placeholderTextColor={C.ink2} style={{ height: 52, borderRadius: 14, backgroundColor: C.sage, paddingHorizontal: 14, fontFamily: F.t700, fontSize: 18, color: C.ink }} />
        <Testo tipo="piccolo" style={{ marginTop: 8 }}>{SALUTE}</Testo>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Bottone testo="Salva" onPress={() => { const n = M.parseSteps(v); if (!n) { strati.avviso("Scrivi un numero di passi valido"); return; } x.steps = n; M.store.set("alldogs-acts", M.S.acts); strati.chiudiFoglio(); strati.avviso("Passi salvati"); }} />
          {x.steps ? <Bottone testo="Togli" tinta="chiaro2" onPress={() => { delete x.steps; M.store.set("alldogs-acts", M.S.acts); strati.chiudiFoglio(); }} /> : null}
        </View>
      </View>
    );
  };
  const d0 = new Date(x.t), d1 = new Date(x.t + x.dur), ora = (d: Date) => d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  strati.foglio({ titolo: "I tuoi passi", sotto: `${x.name} · ${d0.toLocaleDateString("it-IT", { day: "numeric", month: "long" })}, dalle ${ora(d0)} alle ${ora(d1)}`, corpo: () => <Corpo /> });
}

function Uscite() {
  const M = motore(), d = M.dog(), nome = nomeCane(), A = M.S.acts as any[], pi = M.paceInfo(), s = M.steps(5000, d);
  const tot = A.reduce((a, x) => ({ km: a.km + x.dist / 1000, ms: a.ms + x.dur }), { km: 0, ms: 0 });
  const elimina = (i: number) => Alert.alert("Eliminare questa passeggiata?", A[i].name, [{ text: "Annulla", style: "cancel" }, { text: "Elimina", style: "destructive", onPress: () => { const via = A.splice(i, 1)[0]; if (via && via.ph) fotoMetti(String(via.t), null).catch(() => {}); M.store.set("alldogs-acts", A); strati.avviso("Passeggiata eliminata"); } }]);
  return (
    <View style={{ paddingHorizontal: MARGINE }}>
      <Sezione titolo={`L'andatura di ${nome}`} />
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14, padding: 16, borderRadius: R.m, backgroundColor: C.water }}>
        <Text style={{ fontFamily: F.titolo, fontSize: 44, letterSpacing: -1.7, lineHeight: 46, color: C.ink, fontVariant: ["tabular-nums"] }}>{Math.round(pi ? pi.pace : M.DEF_PACE)}'</Text>
        <Text style={{ flex: 1, fontFamily: F.t600, fontSize: 14, lineHeight: 19, color: C.ink }}><Text style={{ fontFamily: F.t800 }}>minuti al km</Text>{pi ? `, ${pi.n === 1 ? "dalla passeggiata salvata" : "dalle ultime " + pi.n + " passeggiate"}. Uso questo numero per i tempi di tutti i sentieri.` : `: per ora è una media. Dopo la prima passeggiata fatta con Avvia percorso imparo l'andatura di ${nome}.`}</Text>
      </View>
      {A.length ? (
        <View style={{ flexDirection: "row", marginTop: 12, borderTopWidth: 1, borderColor: C.sage2 }}>
          {[[String(A.length), A.length === 1 ? "passeggiata" : "passeggiate"], [`${M.kmN(tot.km.toFixed(1))} km`, "in totale"], [M.fmtDur(tot.ms), "in cammino"]].map(([a, b], i) => (
            <View key={i} style={{ flex: 1, paddingTop: 10, paddingLeft: i ? 12 : 0, borderLeftWidth: i ? 1 : 0, borderColor: C.sage2 }}><Text style={{ fontFamily: F.titolo, fontSize: 22, color: C.ink, fontVariant: ["tabular-nums"] }}>{a}</Text><Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.ink2 }}>{b}</Text></View>
          ))}
        </View>
      ) : null}
      <Sezione titolo="Diario" destra={A.length ? `${A.length} ${A.length === 1 ? "uscita" : "uscite"}` : undefined} />
      {!A.length ? <Vuoto posa="attivita" titolo="Ancora nessuna uscita" testo="Apri un sentiero o crea un giro e tocca Avvia percorso: alla fine l'uscita arriva qui, con la mappa del percorso fatto."><Bottone testo="Trova un sentiero" icona="search" onPress={() => nav.sezione("esplora")} /></Vuoto> : null}
      {A.map((x, i) => {
        const k = x.dist / 1000, p = k >= 0.1 ? Math.round(x.dur / 60000 / k) : null, path = M.outPath(x), um = UMORI.find((m) => m[0] === x.mood);
        const con = x.dogs && M.DOGS.list.length > 1 ? M.andNames(x.dogs.map((id: string) => (M.DOGS.list.find((y: any) => y.id === id) || {}).name).filter(Boolean)) : "";
        return (
          <View key={x.t} style={{ borderRadius: R.m, overflow: "hidden", backgroundColor: C.cream, marginBottom: 14 }}>
            {path ? (
              <Tocco hitSlop={0} onPress={() => nav.apri("uscita", x.t)} accessibilityLabel="Apri la mappa del percorso fatto">
                <Foto uri={M.staticImg(path, 640, 320)} style={{ width: "100%", height: 170 }} />
                <View style={{ position: "absolute", right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.cream, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}><Icona nome="expand" size={14} /><Text style={{ fontFamily: F.t800, fontSize: 12.5, color: C.ink }}>Apri la mappa</Text></View>
              </Tocco>
            ) : null}
            <View style={{ padding: 14, paddingTop: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.titolo, fontSize: 18, color: C.ink }}>{x.name}</Text>
                  <Text style={{ fontFamily: F.t600, fontSize: 13.5, lineHeight: 18, color: C.ink2, fontVariant: ["tabular-nums"] }}>{new Date(x.t).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} · {M.km(x.dist)} km · {M.fmtDur(x.dur)}{p ? ` · ${p}' al km` : ""}{con ? ` · con ${con}` : ""}</Text>
                </View>
                <BottoneTondo icona="trash" size={40} sfondo={C.sage} onPress={() => elimina(i)} accessibilityLabel="Elimina la passeggiata" />
              </View>
              <Text style={{ fontFamily: F.t700, fontSize: 13.5, color: C.ink, marginTop: 6, fontVariant: ["tabular-nums"] }}>{Math.round(x.dist / M.dogStep(d.weight)).toLocaleString("it-IT")} passi di {nome} · {x.steps ? `i tuoi ${x.steps.toLocaleString("it-IT")}` : `tu circa ${Math.round(x.dist / M.myStride()).toLocaleString("it-IT")}`}{x.up ? ` · ↑ circa ${x.up} m` : ""}</Text>
              <Testo tipo="piccolo">{x.gps ? "Distanza misurata col GPS" : "Distanza del percorso previsto"}</Testo>
              {x.ph ? <FotoSalvata chiave={String(x.t)} style={{ width: "100%", height: 170, borderRadius: 14, marginTop: 10 }} /> : null}
              {um || x.note ? <Text style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 20, color: C.ink, marginTop: 8 }}>{um ? <Text style={{ fontFamily: F.t800 }}>{um[1]}. </Text> : null}{x.note || ""}</Text> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                <Chip piccolo sfondo={C.sage} icona="edit" testo={um || x.note || x.ph ? "Modifica il diario" : "Scrivi com'è andata"} onPress={() => apriDiario(i)} />
                <Chip piccolo sfondo={C.sage} testo={x.steps ? "Cambia i passi" : "Aggiungi i tuoi passi"} onPress={() => foglioPassi(i)} />
              </View>
            </View>
          </View>
        );
      })}
      <Sezione titolo={`Quanti passi fa ${nome}?`} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1, padding: 14, borderRadius: R.m, backgroundColor: C.cream }}><Text style={S.grande}>{s.me.toLocaleString("it-IT")}</Text><Text style={S.sotto}>i tuoi passi in 5 km</Text></View>
        <View style={{ flex: 1, padding: 14, borderRadius: R.m, backgroundColor: C.lime }}><Text style={S.grande}>{s.dog.toLocaleString("it-IT")}</Text><Text style={S.sotto}>i passi di {nome}</Text></View>
      </View>
      <Testo tipo="piccolo" style={{ marginTop: 8 }}>{M.myStride() !== 0.75 ? `Il tuo passo misurato è di circa ${Math.round(M.myStride() * 100)} cm.` : "Per te uso un passo medio di 75 cm: scrivendo i tuoi passi veri nelle passeggiate, l'app impara il tuo."} Per {nome} è una stima dalla taglia.</Testo>
    </View>
  );
}

function Salvati() {
  const M = motore(), d = M.dog();
  useEffect(() => { try { M.showSaved(); } catch {} }, []);
  const giri = M.S.routes as any[], sentieri = (M.S.saved as number[]).map((id) => M.TR.get(id)).filter(Boolean);
  const carico = M.S.saved.length > sentieri.length;
  if (!giri.length && !M.S.saved.length) return <Vuoto posa="salvati" titolo="Ancora niente di salvato" testo="Tocca il cuore su un sentiero, o Salva su un giro creato: li ritrovi qui per rifarli."><Bottone testo="Cerca un sentiero" icona="search" onPress={() => nav.sezione("esplora")} /></Vuoto>;
  return (
    <View style={{ paddingHorizontal: MARGINE }}>
      {giri.length ? <Sezione titolo="I miei giri" destra={String(giri.length)} /> : null}
      {giri.map((r, i) => (
        <Tocco key={r.t} hitSlop={0} onPress={() => { M.S.gen = [Object.assign({}, r)]; M.S.genIdx = 0; M.S.start = r.path[0]; nav.sezione("crea"); setTimeout(() => { try { M.showGen(); } catch {} }, 200); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1.5, borderBottomColor: C.sage2 }}>
          <Foto uri={M.staticImg(r.path, 200, 200)} style={{ width: 64, height: 64 }} rotonda={16} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.t700, fontSize: 16, color: C.ink }}>{r.name}</Text>
            <Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>{new Date(r.t).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}{r.source === "chat" ? " · creato con l'assistente" : ""} · {M.km(r.len)} km · ↑ {r.up} m</Text>
          </View>
          <BottoneTondo icona="trash" size={40} onPress={() => { M.S.routes.splice(i, 1); M.store.set("alldogs-routes", M.S.routes); strati.avviso("Giro eliminato"); }} accessibilityLabel="Elimina il giro" />
        </Tocco>
      ))}
      {M.S.saved.length ? <Sezione titolo="Sentieri da rifare" destra={String(M.S.saved.length)} /> : null}
      {carico && !sentieri.length ? <Testo tipo="secondo">Sto caricando…</Testo> : null}
      {sentieri.map((tr: any) => <CartaSentiero key={tr.id} tr={tr} res={M.verdict(M.item(tr), d, M.S.day)} onApri={() => nav.apri("sentiero", tr.id)} />)}
    </View>
  );
}

function Scaricate() {
  const L = listaScaricate();
  if (!L.length) return <Vuoto posa="esplora" titolo="Nessuna mappa scaricata" testo="Apri un sentiero e tocca Scarica: percorso e mappa restano nel telefono e funzionano anche in montagna senza campo."><Bottone testo="Trova un sentiero" icona="search" onPress={() => nav.sezione("esplora")} /></Vuoto>;
  return (
    <View style={{ paddingHorizontal: MARGINE }}>
      <Sezione titolo="Sul telefono" destra={String(L.length)} />
      {L.map((x) => (
        <Tocco key={x.id} hitSlop={0} onPress={() => foglioScarica(x.id, x.o, x.riga, () => { const M = motore(), o = x.o; partiCon(o, { len: M.oTot(o), one: o.len, ret: o.ret, shape: o.shape, up: o.up, scale: o.scale || "", start: o.path[0], loop: o.loop, dogs: o.dogs }, o.name); })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: C.sage2 }}>
          <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: C.water, alignItems: "center", justifyContent: "center" }}><Icona nome="down" size={22} /></View>
          <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t700, fontSize: 16, color: C.ink }}>{x.nome}</Text><Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>{x.riga}</Text></View>
          <Icona nome="chev" size={18} colore={C.ink2} />
        </Tocco>
      ))}
    </View>
  );
}

export function Attivita({ attiva }: { attiva: boolean }) {
  useMotore();
  const st = useNav(), nome = nomeCane();
  const v = st.attivita;
  return (
    <PaginaGrande colore={TESTATA.attivita} titolo="Attività" frase={v === "saved" ? "I sentieri che vogliamo rifare." : v === "off" ? "Le mappe che funzionano anche senza campo." : "Tutto quello che abbiamo fatto insieme."} posa={v === "saved" ? "salvati" : "attivita"} attiva={attiva} sbuca consigli={[{ titolo: "Un consiglio", testo: `Dopo ogni uscita scrivi com'è andata: così la prossima volta scelgo meglio per ${nome}.` }, { titolo: "Zecche", testo: "Al ritorno controllami orecchie, collo e zampe." }]}>
      <Segmenti voci={[["diary", "Uscite"], ["saved", "Salvati"], ["off", "Scaricate"]]} valore={v} onCambia={(k) => nav.attivita(k)} style={{ marginHorizontal: MARGINE, marginTop: 14 }} />
      {v === "diary" ? <Uscite /> : v === "saved" ? <Salvati /> : <Scaricate />}
    </PaginaGrande>
  );
}

const S = {
  h: { fontFamily: F.t800, fontSize: 15.5, color: C.ink } as const,
  grande: { fontFamily: F.titolo, fontSize: 28, letterSpacing: -0.8, color: C.ink, fontVariant: ["tabular-nums"] as any } as const,
  sotto: { fontFamily: F.t700, fontSize: 13, color: C.ink2 } as const,
};
