// Esplora: saluto, Gohan nella fascia lime, meteo per il cane, ricerca, filtri, mappa vera e sentieri consigliati.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, ScrollView, Text, View } from "react-native";
import * as Location from "expo-location";
import Animated, { runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BARRA_H, C, F, MARGINE, OMBRA, R } from "../theme";
import { motore, pagina, pulito, useMotore } from "../motore";
import { nav } from "../nav";
import { Bottone, BottoneTondo, Chip, Icona, Sezione, Testo, Tocco } from "../ui/base";
import { FotoCane, nomeCane } from "../ui/BarraMenu";
import { Mascotte } from "../ui/Mascotte";
import { Nuvoletta } from "../ui/Testate";
import { BannerMeteo, oggiPerIlCane } from "../ui/meteo";
import { InvitoFoto } from "../ui/FotoAvatar";
import { TIPO_PARCO, apriParco, chiudiParco, elencoParchi, parcoAttivo, parchiVicini } from "../parchi";
import { CartaSentiero, Foto, Vuoto, impegnoTesto, verdettoTesto } from "../ui/sentieri";
import { PastiglieMomento, strati, useStratoAperto } from "../ui/strati";
import { Mappa } from "../mappa/Mappa";
import { foglioMappe } from "../mappa/fogli";
import { usePiena } from "../mappa/Galleggiante";

const W = Dimensions.get("window").width, H = Dimensions.get("window").height;
const MAPPA_H = 300;

/** imposta un filtro del motore (come scegliere una voce nella fila dei filtri del sito) */
export function filtro(id: string, v: string) {
  const M = motore();
  pagina().el(id).value = v;
  M.S.limit = 20;
  M.fitPending = true;
  M.renderList();
}
export const valoreFiltro = (id: string): string => pagina().el(id).value;
export function contaFiltri(): number {
  const M = motore();
  return ["f-dog", "f-fit", "f-type", "f-eff", "f-len", "f-up", "f-dif", "f-zone"].filter((id) => valoreFiltro(id) !== "all").length + (M.S.act ? 1 : 0) + M.S.feat.length + (M.S.day > 0 ? 1 : 0);
}

function fraseDiGohan(): string {
  const M = motore(), o = oggiPerIlCane(), righe = (M.S.rows || []) as any[];
  const n = righe.filter((r) => r.res.v === 0).length;
  const quanti = n === 0 ? "" : n === 1 ? "un sentiero fa per me" : `${n > 9 ? "tanti" : ["", "", "due", "tre", "quattro", "cinque", "sei", "sette", "otto", "nove"][n]} sentieri fanno per me`;
  if (M.S.far) return "Avvicina la mappa su una zona: ti dico quali sentieri fanno per me.";
  if (!o.w) return quanti ? `Qui vicino ${quanti}.` : "Annuso i sentieri qui intorno…";
  if (o.st === 2) return "Adesso fa troppo caldo per me: aspettiamo un'ora più fresca.";
  if (o.now.rain >= 60) return "Mi sa che piove: un giro corto e poi a casa.";
  const cielo = o.now.c <= 1 ? "C'è il sole" : o.now.c <= 3 ? "Cielo un po' coperto" : "Tempo incerto";
  return quanti ? `${cielo}: ${quanti}.` : `${cielo}. Sposta la mappa per trovare altri sentieri.`;
}

function consigli() {
  const o = oggiPerIlCane(), out: { titolo: string; testo: string }[] = [];
  if (o.w) {
    out.push({ titolo: "Il meteo", testo: `Adesso ${Math.round(o.now.f)}° percepiti. ${o.quando ? o.quando + "." : ""}`.trim() });
    if (o.zampe) out.push({ titolo: "Le mie zampe", testo: pulito(o.zampe.t[0]) });
  }
  for (const h of o.hz.slice(0, 2)) out.push({ titolo: h.t, testo: h.d.split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".") });
  return out.length ? out : [{ titolo: "Un consiglio", testo: "Porta sempre acqua e ciotola: bevo poco ma spesso." }];
}

function foglioGiorno() {
  const M = motore();
  strati.foglio({
    titolo: "Quando",
    corpo: () => (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 6 }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => <Chip key={i} sfondo={C.sage} testo={M.dayName(i)} attivo={M.S.day === i} onPress={() => { M.S.day = i; pagina().el("f-day").value = String(i); M.renderList(); strati.chiudiFoglio(); }} />)}
        <Testo tipo="piccolo" style={{ width: "100%", marginTop: 8 }}>I verdetti usano il meteo del giorno che scegli.</Testo>
      </View>
    ),
  });
}

export function Esplora({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore(), ins = useSafeAreaInsets(), nome = nomeCane();
  const aperto = useStratoAperto();
  const y = useSharedValue(0), slotY = useSharedValue(900), inFondo = useSharedValue(0), bandaFine = useSharedValue(400);
  const [piena, tuttoSchermo] = usePiena("hostExplore", attiva);
  // all'apertura dell'app la mappa parte da dove sei (se hai già dato il permesso), non dall'ultimo posto guardato
  useEffect(() => {
    let via = false;
    (async () => {
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();
        if (!granted) return;
        await new Promise((r) => setTimeout(r, 1200));
        if (via) return;
        const p = await motore().getPos();
        if (via || !p) return;
        try { motore().showMe(p); } catch {}
        motore().goPlace(p, 14, null);
      } catch {}
    })();
    return () => { via = true; };
  }, []);
  const [scorri, setScorri] = useState(true);
  const scroller = useRef<Animated.ScrollView>(null);

  const righe = (M.S.rows || []) as any[];
  const af = !!M.activeFilters() || M.S.day > 0;
  const zona = useMemo(() => {
    if (M.S.far) return "Italia";
    const cnt: Record<string, number> = {};
    righe.slice(0, 40).forEach((r) => { if (r.tr.zone) cnt[r.tr.zone] = (cnt[r.tr.zone] || 0) + 1; });
    return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || "Italia";
  }, [righe, M.S.far]);
  const famosi = useMemo(() => { try { return af || M.S.far ? [] : M.famousMatch().filter((m: any) => !(m.tr && m.tr.dg && m.tr.dg[0] === "no")); } catch { return []; } }, [righe, af, M.S.far, M.S.trails]);
  const parchi = useMemo(() => {
    const b = M.S.view.b, ps: any[] = [];
    if (!M.S.far && !af) for (const k in M.PL) for (const p of M.PL[k].parks || []) if (p.c[0] >= b[0][0] && p.c[0] <= b[1][0] && p.c[1] >= b[0][1] && p.c[1] <= b[1][1]) ps.push(p);
    return ps.sort((a, b2) => b2.d - a.d).slice(0, 10);
  }, [righe, af, M.S.far, Object.keys(M.PL).length]);

  const aree = useMemo(() => { try { return parchiVicini(M.S.view.c, 60, 8); } catch { return []; } }, [Math.round(M.S.view.c[0] * 20), Math.round(M.S.view.c[1] * 20), elencoParchi().length]);

  // Gohan sbuca solo quando la fascia lime non si vede più e la pagina è arrivata in fondo
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    const max = e.contentSize.height - e.layoutMeasurement.height;
    inFondo.value = max > 20 && e.contentOffset.y >= max - 40 && e.contentOffset.y >= bandaFine.value ? 1 : 0;
  });
  const dillo = useCallback((on: boolean) => strati.sbuca(on, consigli()), []);
  useAnimatedReaction(() => inFondo.value, (v, p) => { if (v !== p) runOnJS(dillo)(!!v && attiva && !piena); }, [attiva, piena]);
  useEffect(() => { if (!attiva || piena) strati.sbuca(false); else strati.sbuca(inFondo.value === 1, consigli()); }, [attiva, piena]);

  // la mappa "galleggia" sopra la pagina e segue il suo posto mentre scorri; a tutto schermo occupa tutto
  const sMappa = useAnimatedStyle(() => (piena
    ? { transform: [{ translateY: 0 }], left: 0, width: W, height: H, borderRadius: 0 }
    : { transform: [{ translateY: slotY.value - y.value }], left: MARGINE, width: W - MARGINE * 2, height: MAPPA_H, borderRadius: R.l }), [piena]);
  useEffect(() => { if (!attiva && piena) tuttoSchermo(false); }, [attiva]);

  const sbircia = M.S.peek != null ? M.TR.get(M.S.peek) : null;
  const sbirciaRes = sbircia ? M.verdictMemo(sbircia, M.dog()) : null;
  const apri = (id: number) => { if (piena) tuttoSchermo(false); nav.apri("sentiero", id); };
  const dove = async () => { try { pagina().el("m-loc").click(); } catch {} };
  const nF = contaFiltri();
  const tipo = valoreFiltro("f-type");
  const totale = M.IDX ? (Object.values(M.IDX.cells) as number[]).reduce((a, b) => a + b, 0) : 0;
  const conta = M.S.far ? "" : af ? `${righe.length} ${righe.length === 1 ? "sentiero" : "sentieri"}${M.S.wide ? ` entro ${M.S.wide.r} km` : ""}` : `${righe.length}`;

  return (
    <View style={{ flex: 1, backgroundColor: C.sage }}>
      <Animated.ScrollView ref={scroller} onScroll={onScroll} scrollEventThrottle={16} scrollEnabled={scorri && !piena} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" contentContainerStyle={{ paddingTop: ins.top + 14, paddingBottom: BARRA_H + ins.bottom + 28 }}>
        <View onLayout={(e) => { slotY.value = e.nativeEvent.layout.y + e.nativeEvent.layout.height + 12; }}>
        <View style={{ paddingHorizontal: MARGINE, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icona nome="pin" size={16} colore={C.ink2} /><Text numberOfLines={1} style={{ fontFamily: F.t700, fontSize: 14, color: C.ink2 }}>{zona}</Text></View>
            <Testo tipo="testata" accessibilityRole="header">Dove andiamo, {nome}?</Testo>
          </View>
          <Tocco onPress={() => nav.sezione("cane")} accessibilityLabel={`Apri il profilo di ${nome}`}><FotoCane size={62} /></Tocco>
        </View>

        <View onLayout={(e) => { bandaFine.value = e.nativeEvent.layout.y + e.nativeEvent.layout.height - ins.top; }} style={{ marginHorizontal: MARGINE, marginTop: 10, backgroundColor: C.lime, borderRadius: R.m, minHeight: 140, paddingVertical: 14, paddingLeft: 12, paddingRight: 138, justifyContent: "center", overflow: "hidden" }}>
          <Nuvoletta testo={fraseDiGohan()} />
          <Mascotte posa="esplora" attiva={attiva && !aperto && !piena} style={{ position: "absolute", right: 2, bottom: 0, width: 134, height: 140 }} />
        </View>

        <InvitoFoto />
        <BannerMeteo />

        <Tocco onPress={() => nav.apri("cerca")} accessibilityLabel="Cerca sentieri e posti" style={{ marginHorizontal: MARGINE, marginTop: 14, height: 52, borderRadius: 999, backgroundColor: C.cream, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18 }}>
          <Icona nome="search" size={22} /><Text style={{ fontFamily: F.t600, fontSize: 16, color: C.ink2 }}>Cerca sentieri e posti</Text>
        </Tocco>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: MARGINE, paddingTop: 12, paddingBottom: 4, gap: 8 }}>
          <Tocco onPress={() => nav.apri("filtri")} accessibilityLabel={`Tutti i filtri${nF ? `, ${nF} attivi` : ""}`} style={{ height: 40, paddingHorizontal: 15, borderRadius: 999, backgroundColor: C.cream, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Icona nome="layers" size={16} /><Text style={{ fontFamily: F.t700, fontSize: 15, color: C.ink }}>Filtri</Text>
            {nF ? <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.lime, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }}><Text style={{ fontFamily: F.t800, fontSize: 12, color: C.ink }}>{nF}</Text></View> : null}
          </Tocco>
          <Chip testo={M.S.day ? M.dayName(M.S.day) : "Oggi"} attivo={M.S.day > 0} onPress={foglioGiorno} />
          <Chip testo="Cani ammessi" attivo={valoreFiltro("f-dog") !== "show"} onPress={() => filtro("f-dog", valoreFiltro("f-dog") === "show" ? "all" : "show")} />
          <Chip testo={`Adatti a ${nome}`} attivo={valoreFiltro("f-fit") === "0"} onPress={() => filtro("f-fit", valoreFiltro("f-fit") === "0" ? "all" : "0")} />
          <Chip testo="Ad anello" attivo={tipo === "loop"} onPress={() => filtro("f-type", tipo === "loop" ? "all" : "loop")} />
          <Chip testo="Fino a 5 km" attivo={valoreFiltro("f-len") === "0-5"} onPress={() => filtro("f-len", valoreFiltro("f-len") === "0-5" ? "all" : "0-5")} />
          <Chip testo="Andata e ritorno" attivo={tipo === "line"} onPress={() => filtro("f-type", tipo === "line" ? "all" : "line")} />
        </ScrollView>
        {M.S.near ? <View style={{ paddingHorizontal: MARGINE, marginTop: 8, flexDirection: "row" }}><Chip testo={`Vicino a ${M.S.near.n}  ✕`} attivo onPress={() => M.setNear(null)} /></View> : null}
        {parcoAttivo() ? <View style={{ paddingHorizontal: MARGINE, marginTop: 8, flexDirection: "row" }}><Chip testo={`${parcoAttivo()!.n}  ✕`} attivo onPress={chiudiParco} /></View> : null}

        </View>
        <View style={{ height: MAPPA_H, marginTop: 12 }} />

        <View style={{ paddingHorizontal: MARGINE }}>
          {famosi.length ? (
            <>
              <Sezione titolo={`Consigliati per ${nome}`} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -MARGINE }} contentContainerStyle={{ paddingHorizontal: MARGINE, gap: 12 }}>
                {famosi.map((m: any) => (m.tr
                  ? <CartaSentiero key={m.i} tr={m.tr} res={M.verdictMemo(m.tr, M.dog())} titolo={m.f.n} larga={W * 0.78} style={{ marginBottom: 4 }} onApri={() => apri(m.tr.id)} />
                  : <CartaLuogo key={m.i} nome={m.f.n} riga="Luogo famoso" sotto="Tocca per vedere i sentieri nei dintorni" img={(M.FAMPH && M.FAMPH[m.f.n] && M.FAMPH[m.f.n][0] && M.FAMPH[m.f.n][0].u) || M.staticPlace(m.f.c)} etichetta="Sentieri vicini" onPress={() => { M.setNear(m.f); scroller.current?.scrollTo({ y: Math.max(0, slotY.value - 80), animated: true }); }} />))}
              </ScrollView>
            </>
          ) : null}
          {!parcoAttivo() && !M.S.far && aree.length ? (
            <>
              <Sezione titolo="Parchi e riserve qui intorno" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -MARGINE }} contentContainerStyle={{ paddingHorizontal: MARGINE, gap: 12 }}>
                {aree.map((p) => <CartaLuogo key={p.id} nome={p.n} riga={TIPO_PARCO[p.k]} sotto={`${p.s.length} ${p.s.length === 1 ? "sentiero" : "sentieri"} nel parco · tocca per vederli`} img={M.staticPlace(p.c)} etichetta={TIPO_PARCO[p.k]} onPress={() => { apriParco(p); scroller.current?.scrollTo({ y: 0, animated: true }); }} />)}
              </ScrollView>
            </>
          ) : null}
          {parchi.length ? (
            <>
              <Sezione titolo="Parchi per una passeggiata" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -MARGINE }} contentContainerStyle={{ paddingHorizontal: MARGINE, gap: 12 }}>
                {parchi.map((p: any, i: number) => <CartaLuogo key={i} nome={p.n} riga={p.dog === "no" ? "Secondo OpenStreetMap i cani non sono ammessi" : p.dog === "leashed" ? "Cani al guinzaglio" : "Verifica sul posto le regole per i cani"} sotto={`Tocca per creare un giro su misura per ${nome}`} img={M.staticPlace(p.c)} etichetta="Parco" onPress={() => M.startAtPlace(p.c, p.n, p)} />)}
              </ScrollView>
            </>
          ) : null}

          <Sezione titolo={parcoAttivo() ? `Sentieri: ${parcoAttivo()!.n}` : M.S.far ? "Sentieri d'Italia" : af ? "Sentieri trovati" : "Sentieri in questa zona"} destra={conta} />
          {af ? <Bottone testo="Azzera i filtri" tinta="chiaro" piccolo icona="x" style={{ marginBottom: 14 }} onPress={() => { M.S.day = 0; pagina().el("reset").click(); }} /> : null}
          {!M.S.ready ? <Vuoto titolo="Annuso i sentieri…" testo="Sto caricando i sentieri d'Italia." />
            : M.S.far ? <Vuoto titolo="Avvicina la mappa" testo={`Scegli una zona, tocca uno dei cerchi con i numeri oppure cerca un luogo: ti mostro i sentieri adatti a ${nome}. Sentieri disponibili: ${totale.toLocaleString("it-IT")}.`}><Bottone testo="Cerca un posto" icona="search" onPress={() => nav.apri("cerca")} /></Vuoto>
            : !righe.length ? (M.S.loadingView ? <Vuoto titolo="Annuso i sentieri…" /> : <Vuoto titolo={af ? "Nessun sentiero con questi filtri" : "Qui non ci sono ancora sentieri"} testo={af ? "Togli un filtro, oppure sposta o allontana la mappa." : "Sposta o allontana la mappa. In città puoi creare un giro con il pulsante +."}>{af ? <Bottone testo="Togli i filtri" onPress={() => { M.S.day = 0; pagina().el("reset").click(); }} /> : <Bottone testo="Crea un giro" icona="plus" onPress={() => nav.sezione("crea")} />}</Vuoto>)
            : righe.slice(0, M.S.limit).map((r) => <CartaSentiero key={r.tr.id} tr={r.tr} res={r.res} onApri={() => apri(r.tr.id)} />)}
          {righe.length > M.S.limit && !M.S.far ? <Bottone testo="Mostra altri sentieri" tinta="chiaro" largo onPress={() => { M.S.limit += 20; M.renderList(); }} /> : null}
          <Testo tipo="piccolo" style={{ marginTop: 22 }}>Sentieri © OpenStreetMap contributors (ODbL) · Mappe e immagini © Mapbox · Meteo Open-Meteo e MET Norway. Il verdetto è un consiglio prudente, non una garanzia.</Testo>
        </View>
      </Animated.ScrollView>

      <Animated.View style={[{ position: "absolute", top: 0, overflow: "hidden", backgroundColor: C.sage2, zIndex: piena ? 30 : 1 }, sMappa]}>
        <Mappa attiva={attiva} style={{ flex: 1 }} onTocco={(on) => setScorri(!on)} legendaSu={sbircia ? 110 : 34} />
        <View style={{ position: "absolute", right: 10, top: piena ? ins.top + 10 : 10, gap: 8 }}>
          <BottoneTondo icona={piena ? "shrink" : "expand"} ombra onPress={() => tuttoSchermo(!piena)} accessibilityLabel={piena ? "Riduci la mappa" : "Mappa a tutto schermo"} />
          <BottoneTondo icona="layers" ombra onPress={() => foglioMappe({ proponi: () => { strati.chiudiFoglio(); nav.sezione("cane"); setTimeout(() => nav.apri("proponi"), 50); } })} accessibilityLabel="Scegli la mappa" />
          <BottoneTondo icona="nav" ombra onPress={dove} accessibilityLabel="Mostra dove sono" />
        </View>
        {sbircia && sbirciaRes ? (
          <>
            <Tocco onPress={() => { M.hidePeek(); }} style={[{ position: "absolute", left: 10, top: piena ? ins.top + 10 : 10, height: 40, borderRadius: 20, paddingHorizontal: 14, backgroundColor: C.cream, flexDirection: "row", alignItems: "center", gap: 6 }, OMBRA]}>
              <Icona nome="x" size={16} /><Text style={{ fontFamily: F.t800, fontSize: 14, color: C.ink }}>Togli</Text>
            </Tocco>
            <Tocco onPress={() => apri(sbircia.id)} hitSlop={0} style={[{ position: "absolute", left: 10, right: 10, bottom: piena ? ins.bottom + 14 : 10, backgroundColor: C.cream, borderRadius: 18, padding: 8, flexDirection: "row", alignItems: "center", gap: 10 }, OMBRA]}>
              <Foto uri={(M.PH[sbircia.id] && M.PH[sbircia.id][0] && M.PH[sbircia.id][0].u) || M.staticImg(sbircia.path, 200, 150)} style={{ width: 76, height: 60 }} rotonda={12} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontFamily: F.titolo, fontSize: 17, color: C.ink, letterSpacing: -0.3 }}>{sbircia.name}</Text>
                <Text numberOfLines={2} style={{ fontFamily: F.t700, fontSize: 13, lineHeight: 17, color: C.ink2 }}>{sbirciaRes.v < 0 ? "Sto valutando…" : `${verdettoTesto(sbirciaRes.v)}${sbirciaRes.short ? ` (${sbirciaRes.short})` : ""} · ${impegnoTesto(sbirciaRes.effort).toLowerCase()}`} · {M.km(M.totLen(sbircia))} km{sbircia.shape === "line" ? " a/r" : ""} · {M.fmtH(sbirciaRes.hours)}</Text>
              </View>
              <Icona nome="chev" size={18} colore={C.ink2} />
            </Tocco>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

function CartaLuogo({ nome, riga, sotto, img, etichetta, onPress }: { nome: string; riga: string; sotto: string; img: string; etichetta: string; onPress: () => void }) {
  return (
    <Tocco onPress={onPress} hitSlop={0} style={{ width: W * 0.78, marginBottom: 4 }}>
      <View style={{ borderRadius: R.m, overflow: "hidden", aspectRatio: 16 / 10, backgroundColor: C.sage2 }}>
        <Foto uri={img} style={{ width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", left: 10, top: 10, backgroundColor: C.cream, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}><Text style={{ fontFamily: F.t800, fontSize: 13, color: C.ink }}>{etichetta}</Text></View>
      </View>
      <Testo tipo="sentiero" numberOfLines={1} style={{ marginTop: 10 }}>{nome}</Testo>
      <Text numberOfLines={1} style={{ fontFamily: F.t600, fontSize: 14, color: C.ink2 }}>{riga}</Text>
      <Text numberOfLines={2} style={{ fontFamily: F.t700, fontSize: 14, color: C.ink, marginTop: 6 }}>{sotto}</Text>
    </Tocco>
  );
}

/** saluto del giorno: la prima volta che apri l'app in una giornata, Gohan saluta con il meteo per il cane */
export function salutoDelGiorno() {
  const M = motore();
  if (!M || !M.S.dog) return;
  const oggi = new Date().toDateString();
  if (M.store.get("alldogs-saluto") === oggi) return;
  const prova = (n: number) => {
    const o = oggiPerIlCane();
    if (!o.w && n < 8) { setTimeout(() => prova(n + 1), 1500); return; }
    if (strati.aperto()) return;
    M.store.set("alldogs-saluto", oggi);
    const nome = nomeCane(), giorno = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
    const voci = o.w ? [{ icona: o.icona, testo: `${Math.round(o.now.f)}° · ${String(o.cielo).toLowerCase()}` }, ...(o.quando ? [{ icona: "clock", testo: o.quando, caldo: o.st > 0 }] : []), ...(o.zampe && o.zampe.lvl ? [{ icona: "paw", testo: "Asfalto caldo", caldo: true }] : [])] : [];
    strati.momento({
      posa: "ciao", sole: true, tipo: giorno.charAt(0).toUpperCase() + giorno.slice(1),
      titolo: `Ciao! Dove andiamo oggi?`,
      testo: !o.w ? `${nome} è pronto: scegli un sentiero o crea un giro.` : o.st === 2 ? "Adesso fa troppo caldo per me: aspettiamo un'ora più fresca." : o.now.rain >= 60 ? "Mi sa che piove: un giro corto e poi a casa." : `${o.titolo}. ${o.quando ? o.quando + "." : ""}`,
      extra: voci.length ? () => <PastiglieMomento voci={voci} /> : undefined,
      bottoni: [{ testo: "Vedi i sentieri", tinta: "lime" }],
    });
  };
  setTimeout(() => prova(0), 1200);
}
