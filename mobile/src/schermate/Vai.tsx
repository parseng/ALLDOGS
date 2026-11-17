// In cammino: mappa dal vivo, prossima svolta, tempo, km fatti e mancanti, passi, avvisi per il cane, Pausa, SOS, Chiudi.
// A tutto schermo, scuro, senza mascotte. La logica (GPS, fuori percorso, pausa acqua, meteo che cambia) è quella del motore.
import { segnalaPericolo } from "../pericoli";
import React, { useEffect, useState } from "react";
import { Alert, Dimensions, Text, TextInput, View } from "react-native";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, OMBRA } from "../theme";
import { aOgniAvvio, motore, pagina, pulito, useMotore } from "../motore";
import { nav as navi } from "../nav";
import { startBackground, stopBackground } from "../location";
import { fotoMetti, scegliFoto } from "../foto";
import { Bottone, BottoneTondo, Icona, Interruttore, Testo, Tocco } from "../ui/base";
import { nomeCane } from "../ui/BarraMenu";
import { Dislivello } from "../ui/grafici";
import { strati } from "../ui/strati";
import { Mappa } from "../mappa/Mappa";
import { foglioMappe } from "../mappa/fogli";
import { apriDiario } from "./Attivita";
import { MedagliaGrande, medaglie } from "./Cane";

const H = Dimensions.get("window").height;

/** freccia della svolta: stelo dal basso e punta nella direzione giusta (come nel sito) */
function Freccia({ t, size = 30, colore = C.lime }: { t: any; size?: number; colore?: string }) {
  const M = motore(), a = M.turnAngle(t);
  let d: string;
  if (a === "end") d = "M6 21V4M6 4h11l-2 4 2 4H6";
  else if (a === "stop") d = "M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11Z";
  else if (a === "rb") d = "M12 22v-9M16 9h4M17.5 6.5 20 9l-2.5 2.5M8 9a4 4 0 1 0 8 0 4 4 0 1 0-8 0";
  else if (Math.abs(a) >= 140) d = a < 0 ? "M16 21V10a4 4 0 0 0-8 0v8M11.500 14.5 8 18l-3.5-3.5" : "M8 21V10a4 4 0 0 1 8 0v8M12.5 14.5 16 18l3.5-3.5";
  else {
    const r = (a * Math.PI) / 180, ex = 12 + 8 * Math.sin(r), ey = 12 - 8 * Math.cos(r), dir = Math.atan2(ey - 12, ex - 12), h = 4.5;
    const pt = (s: number) => `${(ex - h * Math.cos(dir + s)).toFixed(1)} ${(ey - h * Math.sin(dir + s)).toFixed(1)}`, E = `${ex.toFixed(1)} ${ey.toFixed(1)}`;
    d = `M12 22v-10L${E}M${pt(0.6)}L${E}L${pt(-0.6)}`;
  }
  return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} fill="none" stroke={colore} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

function foglioIndicazioni() {
  const M = motore();
  strati.foglio({
    titolo: "Indicazioni passo-passo",
    corpo: () => {
      const n = M.nav;
      if (!n) return null;
      const L: any[] = n.turns.map((t: any) => ({ ...t })).concat((n.o.stops || []).slice(1).map((x: any, i: number) => ({ km: x.km, stop: 1, text: `Tappa ${i + 2}: ${x.t}` })));
      L.push({ km: n.total, end: 1, text: n.o.loop ? "Arrivo: sei tornato alla partenza" : "Metà strada: fine dell'andata, ora si torna indietro alla partenza" });
      L.sort((a, b) => a.km - b.km);
      const nx = L.findIndex((t) => t.km > n.prog + 5);
      return (
        <View>
          <Testo tipo="secondo">{n.o.turns && n.o.turns.length ? "Indicazioni ricavate dal calcolo del percorso sulle strade." : "Ricavate dalla forma del tracciato e dagli incroci con gli altri sentieri: segui sempre anche i segnavia."}</Testo>
          {L.map((t, i) => {
            const passata = i < nx, dd = t.km - n.prog;
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.sage2, opacity: passata ? 0.45 : 1 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: i === nx ? C.lime : C.sage, alignItems: "center", justifyContent: "center" }}><Freccia t={t} size={24} colore={C.ink} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: F.t800, fontSize: 15, color: C.ink }}>{passata ? "Fatto" : i === nx && dd <= 30 ? "Adesso" : "Tra " + M.fmtM(dd)}</Text>
                  <Text style={{ fontFamily: F.t600, fontSize: 14, color: C.ink2 }}>{pulito(t.text)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      );
    },
  });
}

function foglioImpostazioni() {
  const M = motore();
  const voci: [string, string, string][] = [["turns", "Indicazioni passo-passo", "Ti scrivo in alto la prossima svolta e a quanti metri è"], ["voice", "Navigazione vocale", "Leggo ad alta voce svolte, tappe, pausa acqua e avvisi"], ["autopause", "Pausa automatica", "Se vi fermate metto in pausa il tempo e riparto quando camminate"], ["wake", "Mantieni acceso lo schermo", "Comodo per guardare la mappa. Il GPS continua anche a schermo spento"]];
  strati.foglio({
    titolo: "Impostazioni di navigazione",
    corpo: () => (
      <View>
        {voci.map(([k, t, s]) => (
          <Tocco key={k} hitSlop={0} accessibilityRole="switch" accessibilityState={{ checked: !!M.NS[k] }} onPress={() => { M.NS[k] = !M.NS[k]; M.store.set("alldogs-navset", M.NS); if (k === "voice" && M.NS[k]) M.say("Navigazione vocale attiva"); if (k === "wake") schermo(M.NS.wake); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t700, fontSize: 15.5, color: C.ink }}>{t}</Text><Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>{s}</Text></View>
            <Interruttore acceso={!!M.NS[k]} />
          </Tocco>
        ))}
      </View>
    ),
  });
}
function schermo(acceso: boolean) {
  if (acceso) activateKeepAwakeAsync("alldogs-vai").catch(() => {});
  else deactivateKeepAwake("alldogs-vai").catch(() => {});
}

/** "Chiudere la passeggiata?": salva nel diario (come nel sito), continua, oppure chiudi senza salvare */
function chiudiAttivita() {
  const M = motore(), n = M.nav;
  if (!n) return;
  const eraInPausa = n.paused;
  if (!eraInPausa) { n.run = M.navElapsed(); n.paused = true; }
  const o = n.o, durata = n.run, piena = M.oTot(o), diversa = Math.abs(n.dist - piena) > piena * 0.2;
  let deciso = false;
  const Corpo = () => {
    const [gps, setGps] = useState(n.dist >= 100);
    const [passi, setPassi] = useState("");
    const salva = () => {
      const prima = medaglie().filter((m) => m.presa).map((m) => m.nome);
      const usaGps = diversa ? gps : true, dist = Math.round(usaGps ? n.dist : piena);
      let tr = n.track.length > 1 ? M.thin(n.track, 15) : [];
      if (tr.length > 400) tr = M.sample(tr, 400);
      const stp = M.parseSteps(passi);
      if (passi.trim() && !stp) { strati.avviso("Il numero dei passi non sembra giusto"); return; }
      M.S.acts.unshift({ dogs: M.DOGS.walk.slice(), t: n.t0, name: o.name, kind: o.kind, id: o.id || null, dur: Math.round(durata), dist, plan: piena, up: Math.round((o.up || 0) * (piena / Math.max(1, o.len)) * Math.min(1, dist / Math.max(1, piena))), gps: usaGps, track: tr, steps: stp, photos: (n.photos || []).length ? n.photos : undefined });
      M.S.acts = M.S.acts.slice(0, 200);
      M.store.set("alldogs-acts", M.S.acts);
      if (n.share) M.sharePub({ k: "e", t: Date.now(), d: dist, e: Math.round(durata / 1000) });
      deciso = true;
      M.stopNav(); stopBackground().catch(() => {}); schermo(false);
      strati.chiudiFoglio();
      navi.sezione("attivita"); navi.attivita("diary");
      const nome = nomeCane(), cane = M.dog();
      setTimeout(() => strati.momento({
        posa: "felice", festa: true, tipo: "Uscita finita", titolo: `Bravi! ${M.km(dist)} km insieme`,
        testo: `${M.fmtDur(durata)} · ${o.name}. ${Math.round(dist / M.dogStep(cane.weight)).toLocaleString("it-IT")} passi per ${nome}. Ora acqua e un po' di riposo.`,
        bottoni: [{ testo: "Chiudi", tinta: "chiaro2" }, { testo: "Com'è andata?", onPress: () => apriDiario(0) }],
        alChiudere: () => {
          // una medaglia nuova? festa con Gohan
          const nuova = medaglie().find((m) => m.presa && !prima.includes(m.nome));
          if (nuova) strati.momento({ posa: "felice", festa: true, tipo: "Nuova medaglia", titolo: nuova.nome + "!", testo: `Una medaglia nuova per ${nome}. La trovi nella sua pagina.`, medaglia: <MedagliaGrande m={nuova} />, bottoni: [{ testo: "Le medaglie", tinta: "chiaro2", onPress: () => navi.sezione("cane") }, { testo: `Grazie, ${nome}` }] });
        },
      }), 450);
    };
    return (
      <View>
        <View style={{ flexDirection: "row", borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.sage2 }}>
          {[[M.fmtDur(durata), "durata"], [`${M.km(n.dist)} km`, "misurati col GPS"], [`${M.km(piena)} km`, o.loop === false ? "previsti, andata e ritorno" : "percorso previsto"]].map(([a, b], i) => (
            <View key={i} style={{ flex: 1, paddingVertical: 10, paddingLeft: i ? 10 : 0, borderLeftWidth: i ? 1 : 0, borderColor: C.sage2 }}><Text style={{ fontFamily: F.titolo, fontSize: 20, color: C.ink, fontVariant: ["tabular-nums"] }}>{a}</Text><Text style={{ fontFamily: F.t700, fontSize: 12, color: C.ink2 }}>{b}</Text></View>
          ))}
        </View>
        {diversa ? (
          <>
            <Text style={{ fontFamily: F.t800, fontSize: 14.5, color: C.ink, marginTop: 12 }}>Quale distanza salvo?</Text>
            {[[true, `Quella misurata dal GPS (${M.km(n.dist)} km)`], [false, `Ho fatto tutto il percorso${o.loop === false ? ", andata e ritorno" : ""} (${M.km(piena)} km)`]].map(([v, t]) => (
              <Tocco key={String(v)} hitSlop={0} onPress={() => setGps(v as boolean)} accessibilityRole="radio" accessibilityState={{ selected: gps === v }} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.ink, alignItems: "center", justifyContent: "center" }}>{gps === v ? <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: C.ink }} /> : null}</View>
                <Text style={{ flex: 1, fontFamily: F.t600, fontSize: 15, color: C.ink }}>{t as string}</Text>
              </Tocco>
            ))}
          </>
        ) : null}
        <Text style={{ fontFamily: F.t800, fontSize: 14.5, color: C.ink, marginTop: 12 }}>I tuoi passi veri (facoltativo)</Text>
        <TextInput value={passi} onChangeText={setPassi} keyboardType="number-pad" placeholder="Es. 4.500" placeholderTextColor={C.ink2} style={{ marginTop: 6, height: 50, borderRadius: 14, backgroundColor: C.sage, paddingHorizontal: 14, fontFamily: F.t700, fontSize: 17, color: C.ink }} />
        <Testo tipo="piccolo" style={{ marginTop: 6 }}>Li trovi nell'app Salute del telefono. Puoi aggiungerli anche dopo, da Attività.</Testo>
        <Bottone testo="Salva nel diario" icona="check" largo style={{ marginTop: 14 }} onPress={salva} />
        <Bottone testo="Continua a camminare" tinta="chiaro2" largo style={{ marginTop: 8 }} onPress={() => strati.chiudiFoglio()} />
        <Bottone testo="Chiudi senza salvare" tinta="chiaro2" largo style={{ marginTop: 8 }} onPress={() => Alert.alert("La passeggiata non verrà salvata", "Confermi?", [{ text: "No", style: "cancel" }, { text: "Sì, chiudi", style: "destructive", onPress: () => {
          if (n.share) M.sharePub({ k: "e", t: Date.now(), d: Math.round(n.dist), e: Math.round(durata / 1000) });
          deciso = true; M.stopNav(); stopBackground().catch(() => {}); schermo(false); strati.chiudiFoglio(); navi.indietro();
        } }])} />
      </View>
    );
  };
  strati.foglio({ titolo: "Chiudere la passeggiata?", pieno: true, corpo: () => <Corpo />, alChiudere: () => { if (!deciso && M.nav && !eraInPausa) { M.nav.paused = false; M.nav.since = Date.now(); } } });
}

export function Vai({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore(), ins = useSafeAreaInsets(), nome = nomeCane();
  const [aperta, setAperta] = useState(false);
  const [altezza, setAltezza] = useState(300);
  const [, tic] = useState(0);
  const el = (id: string) => pagina().el(id);
  useEffect(() => {
    if (!attiva) return;
    // il motore aggiorna i suoi testi solo se "la pagina In cammino è aperta"
    el("s-vai").classList.add("on");
    startBackground().catch(() => {});
    schermo(!!M.NS.wake);
    const t = setInterval(() => tic((x) => x + 1), 1000);
    return () => { clearInterval(t); el("s-vai").classList.remove("on"); schermo(false); };
  }, [attiva]);
  useEffect(() => { try { el("hostNav").clientHeight = H; el("nav-bot").offsetHeight = altezza; if (aperta) el("nav-bot").classList.add("open"); else el("nav-bot").classList.remove("open"); } catch {} }, [altezza, aperta]);

  const n = M.nav;
  if (!n) return <View style={{ flex: 1, backgroundColor: C.ink, alignItems: "center", justifyContent: "center", padding: 24 }}><Testo colore={C.cream} centro>Nessuna passeggiata in corso.</Testo><Bottone testo="Torna indietro" style={{ marginTop: 16, alignSelf: "center" }} onPress={() => navi.indietro()} /></View>;

  const o = n.o, d = M.dog(), tempo = M.navElapsed(), fatti = n.dist, lin = o.loop === false;
  const mancano = lin ? (n.back ? Math.max(0, n.prog) : Math.max(0, n.total - n.prog) + n.retC) : Math.max(0, n.total - n.prog);
  const arrivati = lin ? n.back && n.prog < 30 : n.prog > 0 && mancano < 30;
  const inMoto = fatti >= 150 && tempo >= 60e3, pk = inMoto ? tempo / 60000 / (fatti / 1000) : 0, pks = Math.round(pk * 60);
  const fuori = n.off != null && n.off > 50 && !!n.pos && !(n.prog < 30);
  const msg = pulito(el("nav-msg").dataset.h || ""), classe = String(el("nav-msg").className || "");
  const meteo = pulito(el("nav-wx").innerHTML || "");
  let svolta: any = null;
  if (M.NS.turns && !arrivati && !(n.off > 50 && n.pos)) {
    svolta = n.back ? { km: 0, end: 1, text: "Ritorno alla partenza per la stessa strada" } : n.turns.find((x: any) => x.km > n.prog + 5) || { km: n.total, end: 1, text: o.loop ? "Arrivo: di nuovo alla partenza" : "Metà strada: ora si torna indietro alla partenza" };
  }
  const dist = svolta ? (n.back ? n.prog : svolta.km - n.prog) : 0;
  const gps = n.gps === "ok" ? "GPS attivo" : n.gps === "denied" ? "Posizione non autorizzata" : n.gps === "no" ? "GPS non disponibile" : "Cerco il GPS…";
  const foto = async () => {
    const f = await scegliFoto({ camera: true });
    if (!f || !M.nav) return;
    const k = "nv-" + n.t0 + "-" + Date.now();
    try { await fotoMetti(k, f.uri); (n.photos = n.photos || []).push({ k, p: n.pos ? M.r5(n.pos) : null, km: Math.round(n.dist) }); M.saveNav(); strati.avviso("Foto salvata: a fine giro la puoi mettere nella recensione"); } catch { strati.avviso("Non riesco a salvare la foto"); }
  };
  const cella = (a: string, b: string, lime?: boolean, piccolo?: string) => (
    <View style={{ width: "33.33%", marginBottom: 10 }}>
      <Text style={{ fontFamily: F.titolo, fontSize: 28, letterSpacing: -0.8, lineHeight: 30, color: lime ? C.lime : C.cream, fontVariant: ["tabular-nums"] }}>{a}{piccolo ? <Text style={{ fontSize: 14 }}> {piccolo}</Text> : null}</Text>
      <Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.onForest2 }}>{b}</Text>
    </View>
  );
  const tondo = (icona: string, etichetta: string, onPress: () => void, extra?: any) => <Tocco onPress={onPress} accessibilityLabel={etichetta} style={[{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.forest2, alignItems: "center", justifyContent: "center" }, extra]}><Icona nome={icona} size={22} colore={C.cream} /></Tocco>;

  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Mappa attiva={attiva} scala="no" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: Math.max(0, altezza - 26) }} />
      {n.paused ? <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: altezza, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(23,28,20,0.45)" }}><Text style={{ backgroundColor: C.yellow, color: C.ink, fontFamily: F.t800, fontSize: 15, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, overflow: "hidden" }}>{n.auto ? "Pausa automatica" : "In pausa: il tempo è fermo"}</Text></View> : null}

      <View style={{ position: "absolute", left: 12, right: 12, top: ins.top + 6 }} pointerEvents="box-none">
        {svolta || fuori ? (
          <Tocco hitSlop={0} onPress={foglioIndicazioni} accessibilityLiveRegion="polite" style={[{ backgroundColor: fuori ? C.coral : C.forest, borderRadius: 20, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12 }, OMBRA]}>
            {fuori ? <Icona nome="alert" size={30} colore={C.ink} /> : <Freccia t={svolta} />}
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: F.t800, fontSize: 17, color: fuori ? C.ink : C.cream }}>{fuori ? `Fuori percorso di ${M.fmtM(n.off)}` : n.pos && dist <= 30 ? "Adesso" : `Tra ${M.fmtM(dist)}`}</Text>
              <Text numberOfLines={2} style={{ fontFamily: F.t600, fontSize: 13, color: fuori ? C.ink : C.onForest2 }}>{fuori ? "Torna sulla linea arancione" : pulito(svolta.text)}</Text>
            </View>
          </Tocco>
        ) : null}
        {msg ? <View style={{ alignSelf: "flex-start", marginTop: 8, maxWidth: "86%", backgroundColor: /c2/.test(classe) ? C.coral : /c1/.test(classe) ? C.yellow : "rgba(23,28,20,0.88)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 }}><Text style={{ fontFamily: F.t700, fontSize: 13.5, lineHeight: 18, color: /c1|c2/.test(classe) ? C.ink : C.cream }}>{msg}</Text></View> : null}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }} pointerEvents="box-none">
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, height: 30, paddingHorizontal: 11, borderRadius: 999, backgroundColor: "rgba(23,28,20,0.85)" }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.gps === "ok" ? C.lime : C.yellow }} /><Text style={{ fontFamily: F.t800, fontSize: 12.5, color: C.cream }}>{gps}</Text>
          </View>
          <View style={{ gap: 8 }}>
            <BottoneTondo icona="volume" size={46} ombra sfondo={M.NS.voice ? C.lime : C.cream} onPress={() => { M.NS.voice = !M.NS.voice; M.store.set("alldogs-navset", M.NS); if (M.NS.voice) M.say("Navigazione vocale attiva"); strati.avviso(M.NS.voice ? "Indicazioni a voce attive" : "Indicazioni a voce spente"); }} accessibilityLabel="Indicazioni a voce" accessibilityState={{ selected: !!M.NS.voice }} />
            <BottoneTondo icona="compass" size={46} ombra sfondo={M.navHeadUp ? C.lime : C.cream} onPress={() => el("nav-comp").click()} accessibilityLabel="Mappa che gira con te o con il nord in alto" />
            <BottoneTondo icona="nav" size={46} ombra onPress={() => el("m-loc").click()} accessibilityLabel="Torna sulla mia posizione" />
            <BottoneTondo icona="layers" size={46} ombra onPress={() => foglioMappe()} accessibilityLabel="Scegli la mappa" />
          </View>
        </View>
      </View>

      <View onLayout={(e) => setAltezza(e.nativeEvent.layout.height)} style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.forest, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 8, paddingBottom: ins.bottom + 16 }}>
        <Tocco hitSlop={10} onPress={() => setAperta(!aperta)} accessibilityLabel={aperta ? "Mostra meno dati" : "Mostra tutti i dati"} style={{ alignItems: "center", paddingBottom: 8 }}><View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.forest2 }} /></Tocco>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cella(M.clock(tempo), "tempo", true)}
          {cella((fatti / 1000).toFixed(2).replace(".", ","), "fatti", true, "km")}
          {cella(arrivati ? "Arrivati" : M.km(mancano), arrivati ? "" : "mancano", false, arrivati ? undefined : "km")}
          {aperta ? <>
            {cella(inMoto && pk < 60 ? `${Math.floor(pks / 60)}:${String(pks % 60).padStart(2, "0")}` : "–", "al km")}
            {cella((tempo > 0 ? fatti / 1000 / (tempo / 3600e3) : 0).toFixed(1).replace(".", ","), "km/h")}
            {cella(Math.round(fatti / M.dogStep(d.weight)).toLocaleString("it-IT"), `passi di ${nome}`)}
          </> : null}
        </View>
        {meteo ? <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}><Icona nome="sun" size={16} colore={C.yellow} /><Text numberOfLines={2} style={{ flex: 1, fontFamily: F.t700, fontSize: 13.5, color: C.onForest2 }}>{meteo}</Text></View> : null}
        {aperta && o.prof ? <View style={{ marginTop: 10 }}><Dislivello p={o.prof} len={o.len} segno={n.total ? n.prog / n.total : 0} scuro /></View> : null}
        {aperta ? <Text style={{ fontFamily: F.t600, fontSize: 13, color: C.onForest2, marginTop: 8 }}>{pulito(el("nav-info").textContent || "")} · {o.name}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Tocco onPress={() => M.sosSheet(n.pos)} accessibilityLabel="Emergenza" style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: C.coral, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.t800, fontSize: 14, color: C.ink }}>SOS</Text></Tocco>
          {tondo("gear", "Impostazioni di navigazione", foglioImpostazioni)}
          {tondo("share", "Condividi la posizione in tempo reale", () => el("nav-share").click(), n.share ? { backgroundColor: C.copper } : null)}
          {tondo("cam", "Scatta una foto del sentiero", foto)}
          {tondo("alert", "Segnala un pericolo lungo il percorso", () => segnalaPericolo(n.pos || null))}
          <View style={{ flex: 1 }} />
          {tondo("x", "Riduci: torna all'app, la passeggiata continua", () => navi.indietro())}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Bottone testo={n.paused ? "Riprendi" : "Pausa"} icona={n.paused ? "play" : "pause"} tinta="fantasma" style={{ flex: 1, alignSelf: "auto", paddingHorizontal: 12 }} onPress={() => el("nav-pause").click()} />
          <Bottone testo="Chiudi attività" icona="flag" tinta="lime" style={{ flex: 1.2, alignSelf: "auto", paddingHorizontal: 12 }} onPress={chiudiAttivita} />
        </View>
      </View>
    </View>
  );
}

// le finestrelle della navigazione del sito diventano quelle native
aOgniAvvio((M) => { M.navSettings = foglioImpostazioni; M.stepsSheet = foglioIndicazioni; });

/** pastiglia "Passeggiata in corso" sopra la barra del menu, quando si esce dalla schermata In cammino */
export function PastigliaInCammino() {
  useMotore();
  const M = motore(), ins = useSafeAreaInsets();
  const [, tic] = useState(0);
  useEffect(() => { const t = setInterval(() => tic((x) => x + 1), 5000); return () => clearInterval(t); }, []);
  if (!M || !M.nav) return null;
  return (
    <Tocco onPress={() => navi.apri("vai")} style={[{ position: "absolute", left: 14, bottom: 84 + ins.bottom + 10, height: 44, borderRadius: 22, paddingHorizontal: 16, backgroundColor: C.forest, flexDirection: "row", alignItems: "center", gap: 8, zIndex: 18 }, OMBRA]}>
      <Icona nome="play" size={16} colore={C.lime} /><Text style={{ fontFamily: F.t800, fontSize: 14, color: C.cream }}>Passeggiata in corso · {M.clock(M.navElapsed())}</Text>
    </Tocco>
  );
}

/** Uscita rivista a tutto schermo: il percorso fatto in una passeggiata del diario */
export function Uscita({ arg, attiva }: { arg?: any; attiva: boolean }) {
  useMotore();
  const M = motore(), ins = useSafeAreaInsets();
  const x = (M.S.acts as any[]).find((a) => a.t === +arg);
  if (!x) return <View style={{ flex: 1, backgroundColor: C.sage, paddingTop: ins.top + 10, paddingHorizontal: 14 }}><BottoneTondo icona="back" onPress={() => navi.indietro()} accessibilityLabel="Indietro" /></View>;
  const k = x.dist / 1000, pc = k >= 0.1 ? Math.round(x.dur / 60000 / k) : null;
  return (
    <View style={{ flex: 1, backgroundColor: C.ink }}>
      <Mappa attiva={attiva} style={{ flex: 1 }} legendaSu={180} />
      <BottoneTondo icona="back" ombra onPress={() => navi.indietro()} accessibilityLabel="Torna al diario" style={{ position: "absolute", left: 12, top: ins.top + 6 }} />
      <BottoneTondo icona="layers" ombra onPress={() => foglioMappe()} accessibilityLabel="Scegli la mappa" style={{ position: "absolute", right: 12, top: ins.top + 6 }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.forest, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, paddingBottom: ins.bottom + 16 }}>
        <Text style={{ fontFamily: F.titolo, fontSize: 20, color: C.cream }}>{x.name}</Text>
        <Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.onForest2 }}>{new Date(x.t).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}, {x.gps && x.track && x.track.length > 2 ? "percorso registrato col GPS" : "percorso previsto (il GPS non l'ha registrato)"}</Text>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          {[[`${M.km(x.dist)} km`, "distanza"], [M.fmtDur(x.dur), "durata"], [pc ? `${pc}'` : "…", "al km"], [x.up ? `${x.up} m` : "…", "salita"]].map(([a, b], i) => (
            <View key={i} style={{ flex: 1 }}><Text style={{ fontFamily: F.titolo, fontSize: 20, color: i < 2 ? C.lime : C.cream, fontVariant: ["tabular-nums"] }}>{a}</Text><Text style={{ fontFamily: F.t700, fontSize: 12, color: C.onForest2 }}>{b}</Text></View>
          ))}
        </View>
      </View>
    </View>
  );
}
