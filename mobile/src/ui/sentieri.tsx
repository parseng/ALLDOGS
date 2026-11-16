// Pezzi per mostrare i sentieri: etichetta del verdetto, cartello col tempo, carta con foto.
import React from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { C, F, R } from "../theme";
import { SITO, motore } from "../motore";
import { BottoneTondo, Icona, Testo, Tocco } from "./base";
import { nomeCane } from "./BarraMenu";

const VC = [C.lime, C.yellow, C.coral], VI = ["check", "alert", "x"];
/** testo del verdetto nel nuovo stile: "Adatto a Gohan", "Con prudenza", "Sconsigliato" */
export const verdettoTesto = (v: number, nome?: string) => (v === 0 ? `Adatto a ${nome || nomeCane()}` : v === 1 ? "Con prudenza" : v === 2 ? "Sconsigliato" : "Sto valutando…");

export function Verdetto({ v, motivo, nome, grande }: { v: number; motivo?: string; nome?: string; grande?: boolean }) {
  if (v < 0) return <View style={{ alignSelf: "flex-start", backgroundColor: C.cream, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 }}><Text style={{ fontFamily: F.t800, fontSize: 13, color: C.ink2 }}>Sto valutando…</Text></View>;
  return (
    <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: VC[v], borderRadius: 999, paddingLeft: 6, paddingRight: 11, paddingVertical: 5, maxWidth: "100%" }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.ink, alignItems: "center", justifyContent: "center" }}><Icona nome={VI[v]} size={13} colore={C.cream} /></View>
      <Text numberOfLines={1} style={{ fontFamily: F.t800, fontSize: grande ? 14.5 : 13, color: C.ink, flexShrink: 1 }}>{verdettoTesto(v, nome)}{motivo ? <Text style={{ fontFamily: F.t600 }}>  ({motivo})</Text> : null}</Text>
    </View>
  );
}

/** cartello segnavia color rame con il tempo calcolato per il cane */
export function Cartello({ testo, icona = "paw" }: { testo: string; icona?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "stretch", height: 30 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.copper, paddingLeft: 10, paddingRight: 8, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}>
        <Icona nome={icona} size={15} />
        <Text style={{ fontFamily: F.t800, fontSize: 14, color: C.ink, fontVariant: ["tabular-nums"] }}>{testo}</Text>
      </View>
      <Svg width={12} height={30} viewBox="0 0 12 30"><Path d="M0 0L12 15L0 30Z" fill={C.copper} /></Svg>
    </View>
  );
}

/** immagine presa dal sito o da Mapbox (il token della mappa accetta solo richieste "dal sito") */
export function Foto({ uri, style, rotonda }: { uri: string; style?: any; rotonda?: number }) {
  return <Image source={{ uri, headers: uri.includes("mapbox.com") ? { Referer: SITO } : undefined }} style={[{ backgroundColor: C.sage2 }, rotonda != null ? { borderRadius: rotonda } : null, style]} contentFit="cover" transition={200} recyclingKey={uri} />;
}

const CANI: Record<string, [string, string]> = { ok: ["check", "Nessun divieto noto"], lea: ["alert", "Al guinzaglio"], lim: ["alert", "Cani ammessi solo in parte"], no: ["x", "Cani vietati"] };
export function RigaCani({ dg }: { dg?: any[] }) {
  const [ic, t] = (dg && CANI[dg[0]]) || ["alert", "Regole sui cani da verificare"];
  const no = dg && dg[0] === "no";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}>
      <Icona nome={ic} size={15} colore={no ? C.dangerInk : C.forest} />
      <Text style={{ fontFamily: F.t800, fontSize: 13, color: no ? C.dangerInk : C.forest }}>{t}</Text>
    </View>
  );
}

const IMPEGNO = ["Facile", "Media", "Difficile"];
export const impegnoTesto = (e: number) => `${IMPEGNO[e] || "…"} per lui`;

/** carta di un sentiero con foto, verdetto, cuore e i numeri per il cane */
export function CartaSentiero({ tr, res, titolo, onApri, larga, style }: { tr: any; res: any; titolo?: string; onApri: () => void; larga?: number; style?: StyleProp<ViewStyle> }) {
  const M = motore();
  const ph = M.PH[tr.id] && M.PH[tr.id][0];
  const salvato = M.S.saved.includes(tr.id);
  const su = M.totUp(tr);
  let img = "";
  try { img = ph ? ph.u : M.staticImg(tr.path); } catch {}
  const dove = [titolo ? tr.name : "", tr.zone, tr.ref ? "sentiero " + tr.ref : "", tr.scale && tr.scale !== "CITY" ? "CAI " + tr.scale : ""].filter(Boolean).join(" · ");
  return (
    <View style={[{ marginBottom: 22, width: larga }, style]}>
      <View style={{ borderRadius: R.m, overflow: "hidden", aspectRatio: 16 / 10, backgroundColor: C.sage2 }}>
        <Tocco onPress={onApri} hitSlop={0} accessibilityLabel={`Apri ${titolo || tr.name}`} style={{ flex: 1 }}>
          {img ? <Foto uri={img} style={{ width: "100%", height: "100%" }} /> : null}
        </Tocco>
        <View style={{ position: "absolute", left: 10, top: 10, right: 64 }} pointerEvents="none"><Verdetto v={res.v} motivo={res.short} /></View>
        <BottoneTondo icona="heart" ombra sfondo={salvato ? C.lime : C.cream} onPress={() => M.toggleSave(tr.id)} accessibilityLabel={salvato ? "Togli dai salvati" : `Salva ${tr.name}`} accessibilityState={{ selected: salvato }} style={{ position: "absolute", right: 10, top: 10 }} />
        {ph ? <Text numberOfLines={1} style={{ position: "absolute", right: 8, bottom: 6, left: 8, textAlign: "right", fontFamily: F.t600, fontSize: 10.5, color: "#fff", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 3 }}>{`Foto ${M.phA(ph.a)}, ${ph.l}`}</Text> : null}
      </View>
      <Tocco onPress={onApri} hitSlop={0}>
        <Testo tipo="sentiero" numberOfLines={2} style={{ marginTop: 10 }}>{titolo || tr.name}</Testo>
        {dove ? <Text numberOfLines={1} style={{ fontFamily: F.t600, fontSize: 14, color: C.ink2 }}>{dove}</Text> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: 12, rowGap: 6, marginTop: 8 }}>
          <Cartello testo={`${M.fmtH(res.hours)} con ${nomeCane()}`} />
          <Text style={S.fatto}>{M.km(M.totLen(tr))} km{tr.shape === "line" ? " a/r" : ""}</Text>
          {su != null ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Icona nome="mount" size={16} /><Text style={S.fatto}>{su} m</Text></View> : null}
          {res.v >= 0 ? <Text style={S.fatto}>{impegnoTesto(res.effort)}</Text> : null}
        </View>
        <RigaCani dg={tr.dg} />
      </Tocco>
    </View>
  );
}
const S = { fatto: { fontFamily: F.t700, fontSize: 15, color: C.ink, fontVariant: ["tabular-nums"] as any } };

/** stato vuoto o di attesa con Gohan fermo e un bottone per ripartire */
export function Vuoto({ titolo, testo, children, posa = "esplora" }: { titolo: string; testo?: string; children?: React.ReactNode; posa?: any }) {
  const { fermaDi } = require("./Mascotte");
  return (
    <View style={{ alignItems: "center", paddingHorizontal: 18, paddingTop: 12, paddingBottom: 26 }}>
      <Image source={fermaDi(posa)} style={{ width: 110, height: 150 }} contentFit="contain" />
      <Text style={{ fontFamily: F.titolo, fontSize: 20, letterSpacing: -0.4, color: C.ink, marginTop: 6, textAlign: "center" }}>{titolo}</Text>
      {testo ? <Text style={{ fontFamily: F.t600, fontSize: 15, lineHeight: 20, color: C.ink2, textAlign: "center", marginTop: 4, maxWidth: 280 }}>{testo}</Text> : null}
      {children ? <View style={{ marginTop: 14, alignItems: "center" }}>{children}</View> : null}
    </View>
  );
}
