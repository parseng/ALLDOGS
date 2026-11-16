// Scheda di un sentiero: verdetto per il cane con il motivo, foto, numeri, dislivello, fondo, ombra, acqua,
// meteo ora per ora, regole, cosa portare, recensione. Tutti i conti sono quelli del motore.
import React, { useEffect, useRef, useState } from "react";
import { Linking, ScrollView, Share, Text, TextInput, View } from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BARRA_H, C, F, MARGINE, OMBRA, R } from "../theme";
import { SITO, motore, pulito, useMotore } from "../motore";
import { nav } from "../nav";
import { Bottone, BottoneTondo, Chip, Icona, Sezione, Testo, Tocco } from "../ui/base";
import { nomeCane } from "../ui/BarraMenu";
import { fermaDi } from "../ui/Mascotte";
import { Dislivello, OreDelGiorno, Striscia, pezziOmbra } from "../ui/grafici";
import { foglioPericoli, foglioQuando } from "../ui/meteo";
import { Foto, Verdetto, Vuoto } from "../ui/sentieri";
import { PastiglieMomento, strati } from "../ui/strati";
import { MappaGalleggiante, usePiena } from "../mappa/Galleggiante";
import { StatoVolo, volo } from "../mappa/Mappa";

const MAPPA_H = 340;
const PUNTO = [C.lime, C.yellow, C.coral];
const CANI_T: Record<string, string> = { no: "Cani vietati", lim: "Cani ammessi solo in parte", lea: "Cani al guinzaglio", ok: "Cani ammessi" };

/** verdetto di Gohan prima di partire, poi si avvia la passeggiata */
export function partiCon(o: any, it: any, titolo: string) {
  const M = motore(), d = M.dog(), res = M.verdict(it, d, 0), nome = nomeCane();
  const vai = () => M.startNav(o);
  const w = res.w, ora = new Date().getHours(), adesso = w && w.H[ora];
  const caldo = adesso && adesso.f > res.cap.heat;
  const brutti = res.why.filter((x: any) => x.lvl === 2).map((x: any) => pulito(x.txt));
  if (res.v === 2 || caldo) {
    strati.momento({
      posa: "preoccupato", caldo: true, tipo: `Prima di partire · ${titolo}`, titolo: caldo ? "Aspettiamo un po'?" : "Sei sicuro?",
      testo: caldo ? `Adesso ci sono ${Math.round(adesso.f)}° percepiti: per ${nome} è caldo.${res.best != null && res.best > ora ? ` Dalle ${res.best} si sta meglio.` : ""}` : brutti[0] || `Per ${nome} questo giro è sconsigliato.`,
      extra: () => <PastiglieMomento voci={[...(adesso ? [{ icona: "sun", testo: `${Math.round(adesso.f)}° adesso`, caldo: !!caldo }] : []), { icona: "mount", testo: `${it.up ?? "…"} m di salita` }, { icona: "clock", testo: M.fmtH(res.hours) }]} />,
      bottoni: [{ testo: "Parto lo stesso", tinta: "chiaro2", onPress: vai }, { testo: "Non ora", tinta: "lime" }],
    });
  } else {
    strati.momento({
      posa: "felice", tipo: `Prima di partire · ${titolo}`, titolo: res.v === 1 ? "Si parte, con prudenza" : "Si parte, oggi è perfetto!",
      testo: res.v === 1 ? pulito((res.why.find((x: any) => x.lvl === 1) || {}).txt || "") : `${M.km(it.len)} km e ${M.fmtH(res.hours)} insieme: è nelle possibilità di ${nome}.`,
      extra: () => <PastiglieMomento voci={[...(adesso ? [{ icona: "sun", testo: `${Math.round(adesso.f)}° adesso` }] : []), { icona: "mount", testo: `${it.up ?? "…"} m di salita` }, { icona: "clock", testo: M.fmtH(res.hours) }]} />,
      bottoni: [{ testo: "Non ora", tinta: "chiaro2" }, { testo: "Avvia", icona: "play", onPress: vai }],
    });
  }
}

function Recensione({ id }: { id: number }) {
  const M = motore();
  const tutte = M.store.get("alldogs-reviews") || {}, r0 = tutte[id] || {};
  const [stelle, setStelle] = useState<number>(r0.stars || 0);
  const [tags, setTags] = useState<string[]>(r0.tags || []);
  const [q, setQ] = useState<Record<string, number | undefined>>({ ...(r0.q || {}) });
  const [nota, setNota] = useState<string>(r0.note || "");
  const salva = () => {
    const all = M.store.get("alldogs-reviews") || {}, old = all[id] || {};
    const qq: any = {};
    Object.keys(q).forEach((k) => { if (q[k] === 0 || q[k] === 1) qq[k] = q[k]; });
    all[id] = { stars: stelle, tags, q: qq, note: nota.trim(), ph: old.ph, pos: old.pos, t: Date.now() };
    M.store.set("alldogs-reviews", all);
    strati.chiudiFoglio();
    strati.avviso("Recensione salvata");
  };
  return (
    <View>
      <Testo tipo="secondo">Com'è andata con {nomeCane()}? Serve a ricordarti com'era il percorso per lui.</Testo>
      <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }} accessibilityLabel="Voto">
        {[1, 2, 3, 4, 5].map((n) => <Tocco key={n} onPress={() => setStelle(n === stelle ? 0 : n)} accessibilityLabel={`${n} su 5`} accessibilityState={{ selected: stelle >= n }} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 30, color: stelle >= n ? C.star : C.sage2 }}>★</Text></Tocco>)}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {M.REV_TAGS.map(([k, t]: string[]) => <Chip key={k} piccolo sfondo={C.sage} testo={t} attivo={tags.includes(k)} onPress={() => setTags(tags.includes(k) ? tags.filter((x) => x !== k) : [...tags, k])} />)}
      </View>
      <Text style={{ fontFamily: F.t800, fontSize: 15.5, color: C.ink, marginTop: 14 }}>Com'era per {nomeCane()}?</Text>
      {M.TQ.map(([k, t]: string[]) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
          <Text style={{ flex: 1, fontFamily: F.t600, fontSize: 14.5, color: C.ink }}>{t}</Text>
          {[[1, "Sì"], [0, "No"]].map(([v, l]) => { const on = q[k] === v; return <Tocco key={String(v)} onPress={() => setQ({ ...q, [k]: on ? undefined : (v as number) })} accessibilityState={{ selected: on }} style={{ minWidth: 48, height: 38, borderRadius: 10, backgroundColor: on ? C.ink : C.sage, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: F.t800, fontSize: 14, color: on ? C.lime : C.ink }}>{l}</Text></Tocco>; })}
        </View>
      ))}
      <TextInput multiline value={nota} onChangeText={setNota} placeholder="Note: ombra, acqua, punti difficili per il cane…" placeholderTextColor={C.ink2} style={{ marginTop: 12, minHeight: 84, borderRadius: 14, backgroundColor: C.sage, padding: 12, fontFamily: F.t600, fontSize: 15, color: C.ink, textAlignVertical: "top" }} />
      <Bottone testo="Salva la recensione" largo style={{ marginTop: 16 }} onPress={salva} />
      <Testo tipo="piccolo" style={{ marginTop: 8 }}>Resta su questo telefono e, se hai fatto l'accesso, nel tuo account.</Testo>
    </View>
  );
}

export function Sentiero({ arg, attiva }: { arg?: any; attiva: boolean }) {
  useMotore();
  const id = +arg, M = motore(), ins = useSafeAreaInsets(), nome = nomeCane();
  const y = useSharedValue(0), slotY = useSharedValue(0);
  const [piena, tuttoSchermo] = usePiena("hostTrail", attiva);
  const [statoVolo, setVolo] = useState<StatoVolo | null>(null);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const tr = M.TR.get(id);
  const t0 = useRef(Date.now()).current;
  const [, tic] = useState(0);
  useEffect(() => { if (tr) return; const t = setInterval(() => tic((n) => n + 1), 800); return () => clearInterval(t); }, [!!tr]);
  useEffect(() => { if (!piena && statoVolo) { volo.ferma(); setVolo(null); } }, [piena]);

  const chiudi = () => { if (piena) tuttoSchermo(false); else nav.indietro(); };
  if (!tr) {
    return (
      <View style={{ flex: 1, backgroundColor: C.sage, paddingTop: ins.top + 10, paddingHorizontal: 14 }}>
        <BottoneTondo icona="back" onPress={() => nav.indietro()} accessibilityLabel="Indietro" />
        <Vuoto titolo={Date.now() - t0 > 12000 ? "Sentiero non trovato" : "Annuso il sentiero…"} testo={Date.now() - t0 > 12000 ? "Torna alla mappa e riprova." : undefined} />
      </View>
    );
  }
  const d = M.dog(), it = M.item(tr), res = M.verdict(it, d, M.S.day), f = M.FT[id], e = M.elev[id], foto = (M.PH[id] || []) as any[];
  const passi = M.steps(it.len, d), sh = M.surfShare(tr), salvato = M.S.saved.includes(id);
  const pericoli = M.trailHaz(tr) as any[];
  const rec = (M.store.get("alldogs-reviews") || {})[id];
  const ombra = !f ? "…" : f.wood >= 0.7 ? "Tanta" : f.wood >= 0.35 ? "A tratti" : "Poca";
  const lodi = res.why.filter((x: any) => x.lvl === 0).map((x: any) => pulito(x.txt));
  const guai = res.why.filter((x: any) => x.lvl === res.v && res.v > 0).map((x: any) => pulito(x.txt));
  const regole: string[] = [];
  if (tr.dogs === "no") regole.push("Secondo OpenStreetMap su questo sentiero i cani non sono ammessi. Controlla i cartelli.");
  else if (tr.dogs === "leashed") regole.push("Cani ammessi al guinzaglio (dati OpenStreetMap).");
  else if (tr.dogs === "yes") regole.push("Cani ammessi (dati OpenStreetMap).");
  if (f && f.f.includes("spiaggia")) regole.push("Passa vicino a una spiaggia: d'estate i cani di solito ci sono vietati, salvo spiagge per cani.");
  if ((e && e.max >= 1000) || (f && f.f.includes("vette"))) regole.push("In montagna puoi incontrare mucche, pecore e cani da guardia del gregge: cane corto e passa largo.");
  if (f && f.f.includes("citta")) regole.push("Tratti in città: guinzaglio al massimo 1,5 m e raccogli i bisogni.");
  regole.push("Nei parchi e nelle riserve il guinzaglio è quasi sempre obbligatorio: guarda i cartelli all'ingresso.");

  const avviaVolo = () => { if (!piena) tuttoSchermo(true); setTimeout(() => volo.parti({ path: tr.path, prof: e && e.p, len: tr.len, shape: tr.shape || "loop", ret: tr.ret || 0 }), 500); };
  const zaino = () => nav.apri("zaino", { km: M.totLen(tr) / 1000, p: tr.start, day: M.S.day, title: tr.name, water: ((f && f.w) || []).length, mount: !!((e && (e.up >= 300 || e.max >= 900)) || (f && f.f.includes("vette"))), beach: !!(f && f.f.includes("spiaggia")), lake: !!(f && (f.f.includes("laghi") || f.f.includes("fiumi"))) });
  const attrezzi: [string, string, () => void][] = [
    ["cube", "Anteprima 3D", avviaVolo],
    ["down", "Scarica", () => nav.apri("scarica", id)],
    ["edit", "Modifica", () => { try { M.editTrail(tr); } catch { strati.avviso("Non riesco ad aprire la modifica."); } }],
    ["bag", "Zaino", zaino],
    ["share", "Condividi", () => { Share.share({ message: `${tr.name}: ${M.km(it.len)} km. Guardalo su AllDogs: ${SITO}#s-${id}` }).catch(() => {}); }],
  ];
  const giorni = res.w ? res.w.daily : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.sage }}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} scrollEnabled={!piena} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BARRA_H + ins.bottom + 110 }}>
        <View style={{ height: MAPPA_H }} />
        <View style={{ paddingHorizontal: MARGINE, paddingTop: 16 }}>
          <Testo tipo="momento" accessibilityRole="header">{tr.name}</Testo>
          <Text style={{ fontFamily: F.t600, fontSize: 14, color: C.ink2, marginTop: 2 }}>{[tr.type === "walk" ? "Giro in città ad anello" : "", tr.zone, tr.ref ? "sentiero " + tr.ref : "", tr.scale && tr.scale !== "CITY" ? "CAI " + tr.scale : ""].filter(Boolean).join(" · ")}</Text>
          <View style={{ marginTop: 10 }}><Verdetto v={res.v} motivo={res.short} grande /></View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, padding: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: !tr.dg ? C.cream : tr.dg[0] === "no" ? C.coral : tr.dg[0] === "ok" ? C.okSoft : "#FFF1BF" }}>
            <Icona nome={tr.dg && tr.dg[0] === "no" ? "x" : tr.dg && tr.dg[0] === "ok" ? "check" : "alert"} size={24} />
            <Text style={{ flex: 1, fontFamily: F.t600, fontSize: 14.5, lineHeight: 19, color: C.ink }}><Text style={{ fontFamily: F.t800 }}>{tr.dg ? CANI_T[tr.dg[0]] : "Cani ammessi?"}</Text>{tr.dg ? `: ${tr.dg[1]}` : " Per questa zona non ho ancora le regole. Porta il guinzaglio e guarda i cartelli all'ingresso."}</Text>
          </View>

          {res.v >= 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingLeft: 14, paddingRight: 8, paddingTop: 10, borderRadius: R.m, backgroundColor: PUNTO[res.v], overflow: "hidden", minHeight: 96 }}>
              <View style={{ flex: 1, paddingBottom: 10 }}>
                <Text style={{ fontFamily: F.titolo, fontSize: 18, color: C.ink }}>{res.v === 0 ? "Perfetto per me!" : res.v === 1 ? "Ci vado, ma con calma" : "Per me è troppo"}</Text>
                <Text numberOfLines={4} style={{ fontFamily: F.t600, fontSize: 14, lineHeight: 18.5, color: res.v === 0 ? C.ink2 : C.ink }}>{(res.v === 0 ? lodi[0] : guai[0]) || ""}</Text>
              </View>
              <Image source={fermaDi(res.v === 0 ? "salvati" : "preoccupato")} style={{ width: 70, height: 96, alignSelf: "flex-end" }} contentFit="contain" contentPosition="bottom" />
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -MARGINE, marginTop: 14 }} contentContainerStyle={{ paddingHorizontal: MARGINE, gap: 8 }}>
            {[...foto.map((p) => ({ u: p.u, t: `Foto ${M.phA(p.a)}, ${p.l}`, link: p.p })), { u: M.staticImg(tr.path, 480, 360), t: "Dal satellite", link: "" }].map((p, i) => (
              <Tocco key={i} hitSlop={0} disabled={!p.link} onPress={() => p.link && Linking.openURL(p.link)} style={{ width: 290, aspectRatio: 4 / 3, borderRadius: R.m, overflow: "hidden", backgroundColor: C.sage2 }}>
                <Foto uri={p.u} style={{ width: "100%", height: "100%" }} />
                <View style={{ position: "absolute", left: 10, bottom: 10, right: 10, alignItems: "flex-start" }}><Text numberOfLines={1} style={{ backgroundColor: C.cream, fontFamily: F.t800, fontSize: 12.5, color: C.ink, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, overflow: "hidden" }}>{p.t}</Text></View>
              </Tocco>
            ))}
          </ScrollView>

          <View style={{ flexDirection: "row", marginTop: 16, borderTopWidth: 1.5, borderBottomWidth: 1.5, borderColor: C.sage2 }}>
            {[[`${M.km(it.len)} km`, it.shape === "lolli" ? "giro completo" : it.loop === false ? "andata e ritorno" : "lunghezza", false], [it.up != null ? `${it.up} m` : "…", it.loop === false ? "salita in tutto" : "dislivello", false], [M.fmtH(res.hours).replace(" min", ""), `con ${nome}`, true], [res.v >= 0 ? M.EFFORT[res.effort] : "…", `per ${nome}`, false]].map(([a, b, cane], i) => (
              <View key={i} style={{ flex: 1, paddingTop: 12, paddingBottom: 10, paddingLeft: i ? 8 : 0, borderLeftWidth: i ? 1.5 : 0, borderColor: C.sage2 }}>
                <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.titolo, fontSize: 20, letterSpacing: -0.4, color: cane ? C.warnInk : C.ink, fontVariant: ["tabular-nums"] }}>{a as string}</Text>
                <Text style={{ fontFamily: F.t700, fontSize: 12.5, lineHeight: 15, color: C.ink2, marginTop: 3 }}>{b as string}</Text>
              </View>
            ))}
          </View>
          <Testo tipo="piccolo" style={{ marginTop: 8 }}>{it.shape === "lolli" ? `Anello con un tratto di andata e ritorno: ${M.km(it.ret)} km fino all'anello, il giro e poi di nuovo lo stesso tratto. ` : it.loop === false ? `Andata e ritorno: ${M.km(it.one || it.len / 2)} km all'andata, poi si torna indietro. ` : "Percorso ad anello. "}Km, salita, tempo e acqua contano tutto il giro e sono giudicati sui limiti di {nome}, non di una persona.</Testo>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 14 }}>
            {attrezzi.map(([ic, t, fn]) => (
              <Tocco key={t} onPress={fn} style={{ alignItems: "center", gap: 5, width: 62 }}>
                <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}><Icona nome={ic} size={22} /></View>
                <Text style={{ fontFamily: F.t700, fontSize: 12, lineHeight: 14, color: C.ink, textAlign: "center" }}>{t}</Text>
              </Tocco>
            ))}
          </View>

          <Sezione titolo={`Com'è per ${nome}`} destra={giorni ? M.dayName(M.S.day, giorni).toLowerCase() : undefined} />
          {res.why.map((x: any, i: number) => (
            <View key={i} style={{ flexDirection: "row", gap: 12, paddingVertical: 10, borderBottomWidth: 1.5, borderBottomColor: C.sage2 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, marginTop: 4, backgroundColor: x.lvl < 0 ? C.sage2 : PUNTO[x.lvl] , borderWidth: 1.5, borderColor: C.ink }} />
              <Text style={{ flex: 1, fontFamily: F.t600, fontSize: 15, lineHeight: 20, color: C.ink }}>{pulito(x.txt)}</Text>
            </View>
          ))}
          {res.cap.notes.length ? <Testo tipo="piccolo" style={{ marginTop: 10 }}>Limiti più prudenti perché {nome} {res.cap.notes.join(", ")}.</Testo> : null}
          <Testo tipo="piccolo" style={{ marginTop: 6 }}>Passi stimati: {nome} circa {passi.dog.toLocaleString("it-IT")}, tu circa {passi.me.toLocaleString("it-IT")}.</Testo>

          {e && e.p && e.p.length > 2 ? <><Sezione titolo="Dislivello" destra={`da ${Math.min(...e.p)} a ${Math.max(...e.p)} m`} /><Dislivello p={e.p} len={it.one || it.len} /></> : null}

          <Sezione titolo="Sotto le zampe" />
          {sh ? (
            <>
              <Striscia pezzi={M.SFK.map((k: string) => ({ c: k === "a" ? C.copper : k === "n" ? C.forest : k === "g" ? C.coral : C.sage2, w: sh[k] }))} legenda={M.SFK.filter((k: string) => sh[k] >= 0.005).map((k: string) => [k === "a" ? C.copper : k === "n" ? C.forest : k === "g" ? C.coral : C.sage2, `${M.SFL[k]} ${Math.round(sh[k] * 100)}%`])} />
              {sh.g >= 0.02 ? <Testo tipo="secondo" style={{ marginTop: 6 }}>Ci sono gradini: fateli con calma, pesano sulle articolazioni.</Testo> : null}
              {sh.a >= 0.4 ? <Testo tipo="secondo" style={{ marginTop: 6 }}>Molto asfalto o pietra: quando fa caldo scotta le zampe, meglio mattina presto o sera.</Testo> : null}
            </>
          ) : <Testo tipo="secondo">Il tipo di fondo non è scritto nei dati: verificalo sul posto.</Testo>}
          {f && f.sh ? <View style={{ marginTop: 8 }}><Striscia pezzi={pezziOmbra(f.sh)} legenda={[[C.yellow, "Al sole"], [C.forest, `All'ombra (${Math.round(f.wood * 100)}%)`]]} /></View> : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {[["drop", "Acqua", !f ? "…" : f.w.length ? (f.w.length === 1 ? "1 fontanella" : `${f.w.length} fontanelle`) : "Nessuna segnata"], ["tree", "Ombra", f ? `${ombra} (${Math.round(f.wood * 100)}%)` : "…"]].map(([ic, a, b]) => (
              <View key={a} style={{ flex: 1, backgroundColor: C.cream, borderRadius: 16, padding: 12, flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.water, alignItems: "center", justifyContent: "center" }}><Icona nome={ic} size={20} /></View>
                <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.ink2 }}>{a}</Text><Text style={{ fontFamily: F.t800, fontSize: 14.5, color: C.ink }}>{b}</Text></View>
              </View>
            ))}
          </View>
          <Testo tipo="piccolo" style={{ marginTop: 8 }}>L'ombra viene dalla mappa satellitare degli alberi (ESA WorldCover), l'acqua da OpenStreetMap: verificale sul posto.</Testo>

          {f && f.f.length ? (
            <>
              <Sezione titolo="Cosa trovate" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {f.f.map((k: string) => <View key={k} style={{ minHeight: 36, justifyContent: "center", paddingHorizontal: 13, borderRadius: 999, backgroundColor: C.okSoft }}><Text style={{ fontFamily: F.t700, fontSize: 14.5, color: C.ink }}>{M.FEATL[k]}{f.n && f.n[k] ? ": " + f.n[k].join(", ") : ""}</Text></View>)}
              </View>
            </>
          ) : null}
          {tr.d ? <Text style={{ fontFamily: F.t500, fontSize: 15.5, lineHeight: 22, color: C.ink, marginTop: 12 }}>{tr.d}</Text> : null}

          <Sezione titolo="Quando uscire" destra={giorni ? M.dayName(M.S.day, giorni).toLowerCase() : undefined} />
          {res.w ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {giorni.time.map((t: string, k: number) => <Chip key={k} piccolo testo={`${k === 0 ? "oggi" : new Date(t + "T12:00").toLocaleDateString("it-IT", { weekday: "short" })} ${Math.round(giorni.temperature_2m_max[k])}°`} attivo={k === M.S.day} onPress={() => { M.S.day = k; M.$("f-day").value = String(k); M.renderList(); }} />)}
              </ScrollView>
              <Text style={{ fontFamily: F.t700, fontSize: 14.5, color: C.ink, marginTop: 10 }}>{M.wxText(giorni.weather_code[M.S.day])} · massima {Math.round(giorni.temperature_2m_max[M.S.day])}°, minima {Math.round(giorni.temperature_2m_min[M.S.day])}° · pioggia {giorni.precipitation_probability_max[M.S.day] ?? 0}%</Text>
              <OreDelGiorno w={res.w} lim={res.cap.heat} />
              {res.best != null ? <Text style={{ fontFamily: F.t700, fontSize: 14, color: C.ink, marginTop: 8 }}>Meglio partire <Text style={{ backgroundColor: C.okSoft }}> verso le {res.best}:00 </Text></Text> : null}
            </>
          ) : <Testo tipo="secondo">{M.S.wxFail ? "Meteo non disponibile in questo momento." : "Sto caricando il meteo…"}</Testo>}
          <Tocco hitSlop={0} onPress={foglioQuando} style={{ flexDirection: "row", alignItems: "center", minHeight: 44, marginTop: 6 }}><Text style={{ flex: 1, fontFamily: F.t800, fontSize: 15, color: C.ink }}>Oggi e domani, ora per ora</Text><Icona nome="chev" size={16} /></Tocco>

          {pericoli.length ? (
            <>
              <Sezione titolo="Attenzione in questo periodo" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{pericoli.map((h) => <Chip key={h.t} piccolo testo={h.t} sfondo="#FFF1BF" onPress={() => foglioPericoli(pericoli)} />)}</View>
            </>
          ) : null}

          <Sezione titolo="Regole del posto" />
          {regole.map((t, i) => <Text key={i} style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 20, color: C.ink, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>{t}</Text>)}
          <Tocco hitSlop={0} onPress={() => nav.apri("regole")} style={{ flexDirection: "row", alignItems: "center", minHeight: 44, marginTop: 2 }}><Text style={{ flex: 1, fontFamily: F.t800, fontSize: 15, color: C.ink }}>Tutte le regole</Text><Icona nome="chev" size={16} /></Tocco>

          <Sezione titolo="Cosa portare" />
          {M.bringList(it, d, res, f).map((t: string, i: number) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, paddingVertical: 9, borderBottomWidth: 1.5, borderBottomColor: C.sage2 }}><Icona nome="check" size={20} colore={C.forest} /><Text style={{ flex: 1, fontFamily: F.t600, fontSize: 15, lineHeight: 20, color: C.ink }}>{pulito(t)}</Text></View>
          ))}
          <Bottone testo="Prepara lo zaino" icona="bag" tinta="chiaro" piccolo style={{ marginTop: 10 }} onPress={zaino} />

          <Sezione titolo="La tua recensione" />
          {rec && (rec.stars || rec.note || (rec.tags && rec.tags.length) || (rec.q && Object.keys(rec.q).length)) ? (
            <View style={{ backgroundColor: C.cream, borderRadius: R.m, padding: 14 }}>
              <Text style={{ fontSize: 20, color: C.star }}>{"★".repeat(rec.stars || 0)}<Text style={{ color: C.sage2 }}>{"★".repeat(5 - (rec.stars || 0))}</Text></Text>
              {M.qSummary(rec.q) ? <Text style={{ fontFamily: F.t700, fontSize: 14, color: C.ink, marginTop: 4 }}>{M.qSummary(rec.q)}</Text> : null}
              {rec.note ? <Text style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 20, color: C.ink, marginTop: 6 }}>{rec.note}</Text> : null}
              <Testo tipo="piccolo" style={{ marginTop: 6 }}>Salvata il {new Date(rec.t).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</Testo>
            </View>
          ) : <Testo tipo="secondo">Dopo il giro racconta com'era per {nome}: scale, acqua, ombra, greggi.</Testo>}
          <Bottone testo={rec ? "Cambia la recensione" : "Scrivi la tua recensione"} icona="star" tinta="chiaro" largo style={{ marginTop: 10 }} onPress={() => strati.foglio({ titolo: "La tua recensione", pieno: true, corpo: () => <Recensione id={id} /> })} />

          <Testo tipo="piccolo" style={{ marginTop: 18 }}>Il verdetto è un consiglio prudente, non una garanzia. {M.paceInfo() ? `Tempo stimato con l'andatura reale di ${nome}: circa ${Math.round(M.pace())} minuti al km.` : `Tempo stimato al passo medio di un cane, pause comprese: dopo la prima passeggiata uso l'andatura reale di ${nome}.`}</Testo>
          {tr.type !== "walk" ? <Tocco hitSlop={0} onPress={() => Linking.openURL(`https://www.openstreetmap.org/relation/${tr.id}`)} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ fontFamily: F.t700, fontSize: 13.5, color: C.ink, textDecorationLine: "underline" }}>Vedi i dati del sentiero su OpenStreetMap</Text></Tocco> : null}
        </View>
      </Animated.ScrollView>

      <MappaGalleggiante attiva={attiva} y={y} slotY={slotY} altezza={MAPPA_H} piena={piena} onPiena={tuttoSchermo} onVolo={setVolo} legendaSu={statoVolo ? 120 : 60}
        sopra={(p) => (
          <>
            <BottoneTondo icona={p ? "x" : "back"} ombra onPress={chiudi} accessibilityLabel={p ? "Chiudi la mappa" : "Indietro"} style={{ position: "absolute", left: 10, top: ins.top + 6 }} />
            {!p ? <BottoneTondo icona="heart" ombra sfondo={salvato ? C.lime : C.cream} onPress={() => M.toggleSave(id)} accessibilityLabel={salvato ? "Togli dai salvati" : "Salva"} style={{ position: "absolute", left: 62, top: ins.top + 6 }} /> : null}
            {p && statoVolo ? (
              <View style={[{ position: "absolute", left: 12, right: 12, bottom: ins.bottom + 14, backgroundColor: C.forest, borderRadius: 20, padding: 14 }, OMBRA]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <BottoneTondo icona={statoVolo.playing ? "pause" : statoVolo.fine ? "loop" : "play"} sfondo={C.lime} onPress={() => volo.pausa()} accessibilityLabel="Pausa o riprendi" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: F.titolo, fontSize: 18, color: C.cream }}>{M.km(statoVolo.km)} di {M.km(statoVolo.tot)} km{statoVolo.back ? " · ritorno" : ""}</Text>
                    <Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.onForest2 }}>{statoVolo.quota != null ? `quota ${statoVolo.quota} m` : "volo sopra il percorso"}</Text>
                  </View>
                  <BottoneTondo icona="x" sfondo={C.forest2} colore={C.cream} onPress={() => { volo.ferma(); setVolo(null); }} accessibilityLabel="Chiudi l'anteprima" />
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: C.forest2, overflow: "hidden", marginTop: 10 }}><View style={{ height: "100%", width: `${Math.round(statoVolo.fr * 100)}%`, backgroundColor: C.lime }} /></View>
              </View>
            ) : null}
            {p && !statoVolo ? (
              <View style={[{ position: "absolute", left: 12, right: 12, bottom: ins.bottom + 14, backgroundColor: C.cream, borderRadius: 20, padding: 14 }, OMBRA]}>
                <Text numberOfLines={1} style={{ fontFamily: F.titolo, fontSize: 19, color: C.ink }}>{tr.name}</Text>
                <Text style={{ fontFamily: F.t700, fontSize: 13.5, color: C.ink2, marginTop: 2 }}>{M.km(it.len)} km{tr.shape === "line" ? " a/r" : ""}{it.up != null ? ` · ${it.up} m di salita` : ""} · {M.fmtH(res.hours)} con {nome}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  <Bottone testo="Volo 3D" icona="cube" tinta="chiaro2" style={{ flex: 1, alignSelf: "auto" }} onPress={avviaVolo} />
                  <Bottone testo="Avvia" icona="play" tinta="scuro" style={{ flex: 1.2, alignSelf: "auto" }} onPress={() => partiCon(M.navObjTrail(tr), M.item(tr), tr.name)} />
                </View>
              </View>
            ) : null}
          </>
        )}
      />

      {!piena ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: BARRA_H + ins.bottom, paddingHorizontal: MARGINE, paddingTop: 12, paddingBottom: 14, backgroundColor: "rgba(238,241,230,0.94)", flexDirection: "row", gap: 8 }}>
          <Bottone testo="Avvia percorso" icona="play" tinta="scuro" style={{ flex: 1.25, alignSelf: "auto" }} onPress={() => partiCon(M.navObjTrail(tr), M.item(tr), tr.name)} />
          <Bottone testo="Portami lì" icona="nav" tinta="chiaro" style={{ flex: 1, alignSelf: "auto" }} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${tr.start[0]},${tr.start[1]}`)} />
        </View>
      ) : null}
    </View>
  );
}
