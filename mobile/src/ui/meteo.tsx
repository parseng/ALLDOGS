// Meteo giudicato per il cane: banner compatto di Esplora, "Quando uscire" ora per ora, pericoli del periodo.
// I conti (limite di caldo del cane, asfalto, ore buone) sono quelli del motore.
import React, { useEffect, useState } from "react";
import { LayoutAnimation, Platform, Text, UIManager, View } from "react-native";
import { C, F } from "../theme";
import { motore, pulito, useMotore } from "../motore";
import { Icona, Testo, Tocco } from "./base";
import { nomeCane } from "./BarraMenu";
import { strati } from "./strati";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);
const ICO = (c: number) => (c <= 1 ? "sun" : c <= 48 ? "cloud" : "rain");
const hh = (h: number) => String(h).padStart(2, "0") + ":00";

/** tutto quello che serve per dire com'è adesso per il cane, nella zona della mappa */
export function oggiPerIlCane(): any {
  const M = motore(), d = M.dog(), cap = M.capacity(d), w = M.dayWx(M.S.view.c, 0), hz = M.hazards({}) as { t: string; d: string }[];
  if (!w) return { hz, w: null as any };
  const hr = new Date().getHours(), now = w.H[hr], lim = cap.heat, mon = new Date().getMonth();
  const buona = (h: number) => w.H[h] && w.H[h].f <= lim && w.H[h].rain < 60;
  const fin: number[][] = [];
  let a: number | null = null;
  for (let h = Math.max(hr, 5); h <= 22; h++) { if (buona(h)) { if (a == null) a = h; } else if (a != null) { fin.push([a, h]); a = null; } }
  if (a != null) fin.push([a, 23]);
  const st = now.f > lim + 4 ? 2 : now.f > lim || now.rain >= 60 ? 1 : 0, notte = hr >= 22 || hr < 5, nome = nomeCane();
  const titolo = st === 2 ? `Troppo caldo per ${nome}` : now.rain >= 60 ? "Probabile pioggia" : st === 1 ? "Caldo: solo un giro breve" : notte ? `Temperatura buona per ${nome}` : "Buon momento per uscire";
  const quando = !fin.length ? (notte ? "" : "Solo uscite brevi") : fin[0][0] <= hr && fin[0][1] >= 23 ? "Bene fino a sera" : fin[0][0] <= hr ? `Meglio entro le ${fin[0][1]}` : fin[0][1] >= 23 ? `Meglio dalle ${fin[0][0]}` : `Meglio ${fin[0][0]}–${fin[0][1]}`;
  let asfalto = 0;
  try { asfalto = Math.round(M.asphaltT({ ...now, h: hr }, w.sr, w.ss, mon)); } catch {}
  const zampe = M.pawInfo(w, hr, d) as { lvl: number; t: string[] } | null;
  const celle: { s: number; passata: boolean; ora: boolean }[] = [];
  for (let h = 6; h <= 22; h++) { const x = w.H[h]; if (!x) continue; celle.push({ s: x.f > lim + 4 ? 2 : x.f > lim || x.rain >= 60 ? 1 : 0, passata: h < hr, ora: h === hr }); }
  return { hz, w, now, st, titolo, quando, asfalto, zampe, celle, cielo: M.wxText(now.c) as string, icona: ICO(now.c) };
}

export function BannerMeteo() {
  useMotore();
  const [aperto, setAperto] = useState(false);
  const [, giro] = useState(0);
  useEffect(() => { const t = setInterval(() => giro((n) => n + 1), 5 * 60000); return () => clearInterval(t); }, []);
  const o = oggiPerIlCane(), nome = nomeCane();
  if (!o.w) {
    if (!o.hz.length) return null;
    return (
      <Tocco onPress={() => foglioPericoli(o.hz)} style={S.banner}>
        <View style={[S.r1, { paddingHorizontal: 12, paddingVertical: 10 }]}><Icona nome="bell" size={18} colore={C.yellow} /><Text style={S.titolo} numberOfLines={1}>In questo periodo: {o.hz.map((h) => h.t.toLowerCase()).join(", ")}</Text></View>
      </Tocco>
    );
  }
  const lvl = o.zampe ? o.zampe.lvl : 0;
  return (
    <View style={S.banner}>
      <Tocco hitSlop={0} onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setAperto(!aperto); }} accessibilityState={{ expanded: aperto }} style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 9 }}>
        <View style={S.r1}>
          <Icona nome={o.icona} size={20} colore={C.yellow} />
          <Text style={{ fontFamily: F.titolo, fontSize: 22, color: C.cream, letterSpacing: -0.4, fontVariant: ["tabular-nums"] }}>{Math.round(o.now.f)}°</Text>
          <Text style={S.titolo} numberOfLines={1}>{o.titolo}<Text style={{ fontFamily: F.t600, color: C.onForest2 }}> · {o.cielo.toLowerCase()}</Text></Text>
          <View style={{ transform: [{ rotate: aperto ? "-90deg" : "90deg" }] }}><Icona nome="chev" size={16} colore={C.onForest2} /></View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 4, marginTop: 3, paddingLeft: 28 }}>
          <View style={S.voce}><Icona nome="paw" size={14} colore={lvl ? C.yellow : C.lime} /><Text style={[S.piccolo, { color: lvl ? C.yellow : C.lime }]}>Asfalto {o.asfalto}°, {["zampe ok", "caldo per le zampe", "scotta"][lvl]}</Text></View>
          {o.quando ? <View style={S.voce}><Icona nome="clock" size={14} colore={C.onForest2} /><Text style={S.piccolo}>{o.quando}</Text></View> : null}
        </View>
      </Tocco>
      {aperto ? (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <Text style={[S.piccolo, { fontFamily: F.t800, fontSize: 12, borderTopWidth: 1, borderTopColor: C.forest2, paddingTop: 10, marginTop: 4 }]}>Ore buone per {nome}, dalle 6 alle 22</Text>
          <View style={{ flexDirection: "row", gap: 2, marginTop: 8, alignItems: "center", height: 16 }} accessibilityLabel={`Ore adatte a ${nome} oggi`}>
            {o.celle.map((c, i) => <View key={i} style={{ flex: 1, height: c.ora ? 16 : 8, backgroundColor: c.ora ? C.cream : [C.lime, C.yellow, C.coral][c.s], opacity: c.passata ? 0.3 : 1 }} />)}
          </View>
          <View style={{ flexDirection: "row", marginTop: 3 }}>{[6, 10, 14, 18, 22].map((h) => <Text key={h} style={{ position: "absolute", left: `${((h - 6) / 17) * 100}%`, fontFamily: F.t600, fontSize: 11, color: C.onForest2 }}>{h}</Text>)}</View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4, marginTop: 22 }}>
            {([[C.lime, "buone"], [C.yellow, "caldo o pioggia"], [C.coral, "da evitare"], [C.cream, "adesso"]] as const).map(([c, t]) => <View key={t} style={S.voce}><View style={{ width: 10, height: 10, backgroundColor: c }} /><Text style={[S.piccolo, { fontSize: 12 }]}>{t}</Text></View>)}
          </View>
          <Text style={{ fontFamily: F.t500, fontSize: 14.5, lineHeight: 20, color: C.cream, marginTop: 10 }}>
            {o.zampe ? pulito(o.zampe.t.join(" ")) + " " : ""}Pioggia {o.now.rain}%.{o.hz.length ? <Text style={{ color: C.yellow, fontFamily: F.t700 }}> Attenzione: {o.hz.map((h) => h.t.toLowerCase()).join(", ")}.</Text> : null}
          </Text>
          <Tocco hitSlop={0} onPress={foglioQuando} style={S.linea}><Icona nome="sun" size={18} colore={C.lime} /><Text style={S.lineaT}>Quando uscire oggi e domani, ora per ora</Text></Tocco>
          {o.hz.length ? <Tocco hitSlop={0} onPress={() => foglioPericoli(o.hz)} style={S.linea}><Icona nome="bell" size={18} colore={C.lime} /><Text style={S.lineaT}>In questo periodo: {o.hz.map((h) => h.t.toLowerCase()).join(", ")}</Text></Tocco> : null}
        </View>
      ) : null}
    </View>
  );
}

export function foglioPericoli(lista: { t: string; d: string }[]) {
  strati.foglio({
    titolo: "Attenzione in questo periodo",
    corpo: () => (
      <View>
        {lista.map((h) => (
          <View key={h.t} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
            <Text style={{ fontFamily: F.t800, fontSize: 15.5, color: C.ink }}>{h.t}</Text>
            <Text style={{ fontFamily: F.t500, fontSize: 14.5, lineHeight: 20, color: C.ink, marginTop: 4 }}>{h.d}</Text>
          </View>
        ))}
        <Testo tipo="piccolo" style={{ marginTop: 10 }}>Sono consigli generali di prudenza: non sostituiscono il veterinario.</Testo>
      </View>
    ),
  });
}

/** Quando uscire: ogni casella è un'ora, dalle 5 alle 22, giudicata per il cane */
export function foglioQuando() {
  const M = motore(), nome = nomeCane();
  const giorno = (i: number) => {
    const d = M.dog(), mon = new Date().getMonth(), hr = new Date().getHours(), w = M.dayWx(M.S.view.c, i);
    if (!w) return null;
    const J: any[] = [];
    for (let h = 5; h <= 22; h++) if (w.H[h]) J.push({ h, ...M.hourJudge(w.H[h], w, d, mon) });
    const fin = M.bestWindows(J, i ? 0 : hr), brutte: Record<string, number> = {};
    J.filter((j) => j.s && (i || j.h >= hr)).forEach((j) => j.why.forEach((t: string) => (brutte[t] = (brutte[t] || 0) + 1)));
    const m = fin[0];
    return (
      <View key={i} style={{ paddingVertical: 12, borderBottomWidth: i ? 0 : 1, borderBottomColor: C.sage2 }}>
        <Text style={{ fontFamily: F.t800, fontSize: 15.5, color: C.ink }}>{M.dayName(i, w.daily)}</Text>
        <View style={{ flexDirection: "row", gap: 2, marginTop: 8 }}>
          {J.map((j) => <View key={j.h} style={{ flex: 1, height: 26, borderRadius: 3, backgroundColor: [C.lime, C.yellow, C.coral][j.s], opacity: !i && j.h < hr ? 0.3 : 1, borderWidth: !i && j.h === hr ? 2 : 0, borderColor: C.ink, overflow: "hidden" }}>{j.dark ? <View style={{ flex: 1, backgroundColor: "rgba(23,28,20,0.3)" }} /> : null}</View>)}
        </View>
        <View style={{ height: 16, marginTop: 3 }}>{J.filter((j) => j.h % 3 === 0).map((j) => <Text key={j.h} style={{ position: "absolute", left: `${((j.h - 5 + 0.2) / J.length) * 100}%`, fontFamily: F.t700, fontSize: 11.5, color: C.ink2 }}>{j.h}</Text>)}</View>
        <Text style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 20, color: C.ink, marginTop: 6 }}>
          {m ? <><Text style={{ fontFamily: F.t800, backgroundColor: fin.lvl ? "#FFF1BF" : C.okSoft }}> {fin.lvl ? "Con prudenza, meglio" : "Meglio"} {m[1] >= 23 ? `dalle ${hh(m[0])} in poi` : `dalle ${hh(m[0])} alle ${hh(m[1])}`} </Text>{fin[1] ? `, oppure ${fin[1][1] >= 23 ? "dalle " + hh(fin[1][0]) + " in poi" : hh(fin[1][0]) + "–" + hh(fin[1][1])}` : ""}.{fin.lvl ? ` Nessuna ora è perfetta per ${nome}: uscite più corte.` : ""}</>
            : <Text style={{ fontFamily: F.t800 }}>{i ? "Domani" : "Oggi"} non ci sono ore davvero adatte: solo uscite brevi per i bisogni.</Text>}
        </Text>
        {Object.keys(brutte).length ? <Testo tipo="piccolo" style={{ marginTop: 4 }}>Ore da evitare per: {Object.keys(brutte).sort((a, b) => brutte[b] - brutte[a]).join(", ")}.</Testo> : null}
        <Testo tipo="piccolo" style={{ marginTop: 4 }}>Buio prima delle {hh(w.sr)} e dopo le {hh(w.ss)} (caselle più scure): se esci, luce o collare luminoso.</Testo>
      </View>
    );
  };
  strati.foglio({
    titolo: `Quando uscire con ${nome}`,
    corpo: () => (
      <View>
        <Testo tipo="secondo">Ogni casella è un'ora, dalle 5 alle 22. Conto caldo e freddo per {nome}, asfalto al sole e pioggia.</Testo>
        <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 4, marginTop: 8 }}>
          {([[C.lime, "buona"], [C.yellow, "con prudenza"], [C.coral, "da evitare"]] as const).map(([c, t]) => <View key={t} style={S.voce}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c }} /><Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.ink2 }}>{t}</Text></View>)}
        </View>
        {giorno(0)}{giorno(1)}
        <Testo tipo="piccolo" style={{ marginTop: 8 }}>Meteo per la zona della mappa. L'asfalto è una stima: in dubbio fai la prova dei 5 secondi con il dorso della mano.</Testo>
      </View>
    ),
  });
}

const S = {
  banner: { marginHorizontal: 18, marginTop: 12, borderRadius: 6, backgroundColor: C.forest } as const,
  r1: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 } as const,
  titolo: { flex: 1, fontFamily: F.t700, fontSize: 15, color: C.cream } as const,
  piccolo: { fontFamily: F.t700, fontSize: 13, color: C.onForest2, fontVariant: ["tabular-nums"] as any } as const,
  voce: { flexDirection: "row", alignItems: "center", gap: 5 } as const,
  linea: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.forest2, minHeight: 44 } as const,
  lineaT: { flex: 1, fontFamily: F.t700, fontSize: 14.5, color: C.cream } as const,
};
