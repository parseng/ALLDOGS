// I mattoni del nuovo design: testo, tocco, icone, bottoni, etichette, righe, segmenti.
import React, { useEffect, useMemo, useState } from "react";
import { AccessibilityInfo, LayoutChangeEvent, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { SvgXml } from "react-native-svg";
import { C, F, MOLLA, MORBIDO, R } from "../theme";
import { ICONE } from "./icone.generated";
import { EXTRA } from "./icone.extra";

// ---------- movimento ridotto ----------
let ridotto = false;
const ascoltaRidotto = new Set<(v: boolean) => void>();
AccessibilityInfo.isReduceMotionEnabled().then((v) => { ridotto = v; console.log("AllDogs: Riduci movimento " + (v ? "ATTIVO (mascotte ferma)" : "spento")); ascoltaRidotto.forEach((f) => f(v)); }).catch(() => {});
AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => { ridotto = v; ascoltaRidotto.forEach((f) => f(v)); });
export const movimentoRidotto = () => ridotto;
export function useMovimentoRidotto() {
  const [v, set] = useState(ridotto);
  useEffect(() => { ascoltaRidotto.add(set); return () => void ascoltaRidotto.delete(set); }, []);
  return v;
}

// ---------- testo ----------
type Tipo = "titolo" | "testata" | "sezione" | "sentiero" | "momento" | "testo" | "forte" | "secondo" | "piccolo" | "etichetta" | "numero";
const TIPI: Record<Tipo, TextStyle> = {
  testata: { fontFamily: F.titolo, fontSize: 31, lineHeight: 32, letterSpacing: -0.93 },
  titolo: { fontFamily: F.titolo, fontSize: 24, lineHeight: 26, letterSpacing: -0.5 },
  momento: { fontFamily: F.titolo, fontSize: 30, lineHeight: 32, letterSpacing: -0.9 },
  sezione: { fontFamily: F.titolo, fontSize: 22, lineHeight: 25, letterSpacing: -0.44 },
  sentiero: { fontFamily: F.titolo, fontSize: 21, lineHeight: 24, letterSpacing: -0.42 },
  numero: { fontFamily: F.titolo, fontSize: 18, lineHeight: 21, letterSpacing: -0.36, fontVariant: ["tabular-nums"] },
  testo: { fontFamily: F.t500, fontSize: 16, lineHeight: 23 },
  forte: { fontFamily: F.t700, fontSize: 15.5, lineHeight: 20 },
  secondo: { fontFamily: F.t600, fontSize: 14, lineHeight: 19, color: C.ink2 },
  piccolo: { fontFamily: F.t600, fontSize: 12.5, lineHeight: 16, color: C.ink2 },
  etichetta: { fontFamily: F.t800, fontSize: 13.5, lineHeight: 17 },
};
export function Testo({ tipo = "testo", colore, centro, style, ...p }: TextProps & { tipo?: Tipo; colore?: string; centro?: boolean }) {
  return <Text {...p} style={[{ color: C.ink }, TIPI[tipo], colore ? { color: colore } : null, centro ? { textAlign: "center" } : null, style]} />;
}
/** Testo con parti in grassetto scritte tra asterischi doppi: "Fino a **12 km**" */
export function TestoRicco({ children, style, forte, ...p }: TextProps & { children: string; forte?: TextStyle; tipo?: Tipo; colore?: string }) {
  const parti = String(children).split(/\*\*(.+?)\*\*/g);
  return <Testo {...p} style={style}>{parti.map((x, i) => (i % 2 ? <Text key={i} style={[{ fontFamily: F.t800 }, forte]}>{x}</Text> : x))}</Testo>;
}

// ---------- icone ----------
export function Icona({ nome, size = 24, colore = C.ink, style }: { nome: string; size?: number; colore?: string; style?: StyleProp<ViewStyle> }) {
  const xml = useMemo(() => {
    const i = ICONE[nome] || EXTRA[nome] || ICONE.paw;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${i.vb}">${i.xml.split("currentColor").join(colore)}</svg>`;
  }, [nome, colore]);
  return <SvgXml xml={xml} width={size} height={size} style={style as any} />;
}
export function Disegno({ xml, size = 40, vb = "0 0 40 40" }: { xml: string; size?: number; vb?: string }) {
  const x = useMemo(() => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${xml}</svg>`, [xml, vb]);
  return <SvgXml xml={x} width={size} height={size} />;
}

// ---------- tocco: tutto ciò che si preme si abbassa un poco ----------
const APressable = Animated.createAnimatedComponent(Pressable);
export function Tocco({ style, onPressIn, onPressOut, children, hitSlop = 4, ...p }: PressableProps & { style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      accessibilityRole="button"
      hitSlop={hitSlop}
      {...p}
      onPressIn={(e) => { s.value = withTiming(0.95, { duration: ridotto ? 0 : 180 }); onPressIn && onPressIn(e); }}
      onPressOut={(e) => { s.value = withTiming(1, { duration: ridotto ? 0 : 180 }); onPressOut && onPressOut(e); }}
      style={[style, st]}
    >
      {children}
    </APressable>
  );
}

// ---------- bottoni ----------
type Tinta = "lime" | "scuro" | "chiaro" | "chiaro2" | "corallo" | "fantasma";
const TINTE: Record<Tinta, [string, string]> = { lime: [C.lime, C.ink], scuro: [C.forest, C.cream], chiaro: [C.cream, C.ink], chiaro2: [C.sage2, C.ink], corallo: [C.coral, C.ink], fantasma: [C.forest2, C.cream] };
export function Bottone({ testo, icona, tinta = "lime", largo, piccolo, style, disabled, ...p }: PressableProps & { testo?: string; icona?: string; tinta?: Tinta; largo?: boolean; piccolo?: boolean; style?: StyleProp<ViewStyle> }) {
  const [bg, fg] = TINTE[tinta];
  return (
    <Tocco {...p} disabled={disabled} accessibilityLabel={p.accessibilityLabel || testo} style={[{ height: piccolo ? 44 : 52, paddingHorizontal: testo ? (piccolo ? 16 : 22) : 0, minWidth: piccolo ? 44 : 52, borderRadius: R.bottone, backgroundColor: bg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: disabled ? 0.5 : 1 }, largo ? { alignSelf: "stretch" } : { alignSelf: "flex-start" }, style]}>
      {icona ? <Icona nome={icona} size={20} colore={fg} /> : null}
      {testo ? <Text numberOfLines={1} style={{ fontFamily: F.t800, fontSize: piccolo ? 14.5 : 16, color: fg }}>{testo}</Text> : null}
    </Tocco>
  );
}
export function BottoneTondo({ icona, size = 44, sfondo = C.cream, colore = C.ink, ombra, style, ...p }: PressableProps & { icona: string; size?: number; sfondo?: string; colore?: string; ombra?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Tocco {...p} style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: sfondo, alignItems: "center", justifyContent: "center" }, ombra ? S.ombra : null, style]}>
      <Icona nome={icona} size={Math.round(size * 0.46)} colore={colore} />
    </Tocco>
  );
}

// ---------- etichette di stato e chip ----------
export function Etichetta({ stato, testo }: { stato: "presto" | "fatto" | "dafare"; testo: string }) {
  const [bg, fg] = stato === "presto" ? [C.yellow, C.ink] : stato === "fatto" ? [C.okBg, C.okInk] : [C.coral, C.ink];
  return (
    <View style={{ height: 28, paddingHorizontal: 11, borderRadius: 14, backgroundColor: bg, flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start" }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: fg, opacity: 0.75 }} />
      <Text style={{ fontFamily: F.t800, fontSize: 13.5, color: fg }}>{testo}</Text>
    </View>
  );
}
export function Chip({ testo, attivo, icona, sfondo = C.cream, piccolo, style, ...p }: PressableProps & { testo: string; attivo?: boolean; icona?: string; sfondo?: string; piccolo?: boolean; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  useEffect(() => { if (attivo && !ridotto) { s.value = 1.12; s.value = withSpring(1, MOLLA); } }, [attivo]);
  return (
    <Animated.View style={st}>
      <Tocco {...p} accessibilityState={{ selected: !!attivo }} style={[{ minHeight: piccolo ? 36 : 40, paddingHorizontal: piccolo ? 13 : 15, borderRadius: R.pieno, backgroundColor: attivo ? C.ink : sfondo, flexDirection: "row", alignItems: "center", gap: 6 }, style]}>
        {icona ? <Icona nome={icona} size={16} colore={attivo ? C.lime : C.ink} /> : null}
        <Text style={{ fontFamily: F.t700, fontSize: piccolo ? 14.5 : 15, color: attivo ? C.lime : C.ink }}>{testo}</Text>
      </Tocco>
    </Animated.View>
  );
}

// ---------- segmenti (Chiedi / Automatico / Lo disegno io …) ----------
export function Segmenti<T extends string>({ voci, valore, onCambia, style }: { voci: [T, string][]; valore: T; onCambia: (v: T) => void; style?: StyleProp<ViewStyle> }) {
  const [w, setW] = useState(0);
  const i = Math.max(0, voci.findIndex((v) => v[0] === valore));
  const x = useSharedValue(0);
  const lw = w ? (w - 8) / voci.length : 0;
  useEffect(() => { x.value = ridotto ? i * lw : withSpring(i * lw, MOLLA); }, [i, lw]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)} style={[{ flexDirection: "row", backgroundColor: C.cream, borderRadius: 16, padding: 4 }, style]} accessibilityRole="tablist">
      {lw ? <Animated.View style={[{ position: "absolute", top: 4, bottom: 4, left: 4, width: lw, borderRadius: 12, backgroundColor: C.ink }, st]} /> : null}
      {voci.map(([k, t]) => (
        <Pressable key={k} onPress={() => onCambia(k)} accessibilityRole="tab" accessibilityState={{ selected: k === valore }} style={{ flex: 1, height: 42, alignItems: "center", justifyContent: "center" }}>
          <Text numberOfLines={1} style={{ fontFamily: F.t800, fontSize: 15, color: k === valore ? C.lime : C.ink }}>{t}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------- righe delle liste ----------
export function Riga({ titolo, sotto, valore, valoreAvviso, pallino, icona, iconaSfondo, destra, freccia, pericolo, ultima, lineaColore = C.sage2, onPress }: { titolo: string; sotto?: string; valore?: string; valoreAvviso?: boolean; pallino?: string; icona?: string; iconaSfondo?: string; destra?: React.ReactNode; freccia?: boolean; pericolo?: boolean; ultima?: boolean; lineaColore?: string; onPress?: () => void }) {
  const dentro = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 11, borderBottomWidth: ultima ? 0 : 1, borderBottomColor: lineaColore }}>
      {pallino ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pallino }} /> : null}
      {icona ? <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: iconaSfondo || C.cream, alignItems: "center", justifyContent: "center" }}><Icona nome={icona} size={18} /></View> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: F.t700, fontSize: 15.5, lineHeight: 19.5, color: pericolo ? C.dangerInk : C.ink }}>{titolo}</Text>
        {sotto ? <Text style={{ fontFamily: F.t600, fontSize: 13.5, lineHeight: 18, color: C.ink2 }}>{sotto}</Text> : null}
      </View>
      {valore ? <Text style={{ fontFamily: F.titolo, fontSize: 18, letterSpacing: -0.36, color: valoreAvviso ? C.warnInk : C.ink, fontVariant: ["tabular-nums"] }}>{valore}</Text> : null}
      {destra}
      {freccia ? <Icona nome="chev" size={16} colore={C.ink2} /> : null}
    </View>
  );
  return onPress ? <Tocco onPress={onPress} hitSlop={0}>{dentro}</Tocco> : dentro;
}
export function RigaMenu({ titolo, sotto, disegno, sfondo, onPress, ultima }: { titolo: string; sotto?: string; disegno: string; sfondo: string; onPress?: () => void; ultima?: boolean }) {
  return (
    <Tocco onPress={onPress} hitSlop={0} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 12, borderBottomWidth: ultima ? 0 : 1.5, borderBottomColor: C.sage2 }}>
      <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: sfondo, alignItems: "center", justifyContent: "center" }}><Icona nome={disegno} size={34} /></View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: F.t700, fontSize: 16, color: C.ink }}>{titolo}</Text>
        {sotto ? <Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>{sotto}</Text> : null}
      </View>
      <Icona nome="chev" size={18} colore={C.ink2} />
    </Tocco>
  );
}

export function Sezione({ titolo, destra, style }: { titolo: string; destra?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 26, marginBottom: 12 }, style]}>
      <Testo tipo="sezione" accessibilityRole="header" style={{ flexShrink: 1 }}>{titolo}</Testo>
      {destra ? <Text style={{ fontFamily: F.t700, fontSize: 14, color: C.ink2, fontVariant: ["tabular-nums"] }}>{destra}</Text> : null}
    </View>
  );
}
export function Carta({ style, children, tinta = C.cream }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode; tinta?: string }) {
  return <View style={[{ backgroundColor: tinta, borderRadius: R.m, padding: 16 }, style]}>{children}</View>;
}
export function Interruttore({ acceso }: { acceso: boolean }) {
  const x = useSharedValue(acceso ? 18 : 0);
  useEffect(() => { x.value = ridotto ? (acceso ? 18 : 0) : withSpring(acceso ? 18 : 0, MOLLA); }, [acceso]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: acceso ? C.forest : "rgba(75,85,69,0.45)", padding: 3 }}>
      <Animated.View style={[{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.white }, st]} />
    </View>
  );
}
/** casella da spuntare (lezioni, zaino): quadratino che diventa lime e si inclina */
export function Spunta({ fatto, size = 26 }: { fatto: boolean; size?: number }) {
  const r = useSharedValue(fatto ? 1 : 0);
  useEffect(() => { r.value = ridotto ? (fatto ? 1 : 0) : withSpring(fatto ? 1 : 0, MOLLA); }, [fatto]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${-6 * r.value}deg` }] }));
  const si = useAnimatedStyle(() => ({ opacity: r.value, transform: [{ scale: 0.4 + 0.6 * r.value }] }));
  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: 9, backgroundColor: fatto ? C.lime : C.sage, alignItems: "center", justifyContent: "center" }, st]}>
      <Animated.View style={si}><Icona nome="check" size={16} /></Animated.View>
    </Animated.View>
  );
}
/** entra dal basso con una dissolvenza: per le schede che cambiano */
export function Entra({ children, chiave, style }: { children: React.ReactNode; chiave?: string | number; style?: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = 0; v.value = withTiming(1, ridotto ? { duration: 100 } : MORBIDO); }, [chiave]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 10 }] }));
  return <Animated.View style={[style, st]}>{children}</Animated.View>;
}

export const S = StyleSheet.create({
  ombra: { shadowColor: C.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6 },
  riga: { flexDirection: "row", alignItems: "center" },
  campo: { height: 56, borderRadius: 16, backgroundColor: C.cream, paddingHorizontal: 16, fontFamily: F.t700, fontSize: 19, color: C.ink },
  campoPiccolo: { minHeight: 48, borderRadius: 14, backgroundColor: C.cream, paddingHorizontal: 14, fontFamily: F.t600, fontSize: 16, color: C.ink },
});
