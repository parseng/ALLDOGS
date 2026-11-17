// Tutto ciò che compare SOPRA le schermate: avvisi brevi, tendine dal basso, momenti grandi con Gohan,
// coriandoli e Gohan che sbuca. Un solo posto, così vale la regola "mai due mascotte insieme".
import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BackHandler, Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BARRA_H, C, F, MOLLA, MORBIDO, OMBRA } from "../theme";
import { quandoAvvisa, useMotore } from "../motore";
import { Bottone, BottoneTondo, Icona, Testo, Tocco, movimentoRidotto, useMovimentoRidotto } from "./base";
import { FORMA, Mascotte, Posa, fermaDi } from "./Mascotte";

type FoglioDati = { titolo: string; corpo: () => React.ReactNode; sotto?: string; alChiudere?: () => void; pieno?: boolean };
type BottoneMomento = { testo: string; tinta?: "lime" | "scuro" | "chiaro2"; icona?: string; onPress?: () => void };
export type MomentoDati = { posa: Posa; tipo: string; titolo: string; testo?: string; extra?: () => React.ReactNode; bottoni: BottoneMomento[]; festa?: boolean; caldo?: boolean; sole?: boolean; alChiudere?: () => void; medaglia?: React.ReactNode };
type Consiglio = { titolo: string; testo: string };

const st = {
  foglio: null as FoglioDati | null,
  momento: null as MomentoDati | null,
  avviso: null as { t: string; n: number } | null,
  festa: 0,
  sbuca: false, // la schermata attuale vorrebbe Gohan che sbuca
  consigli: [] as Consiglio[],
  barra: true,
  v: 0,
};
const iscritti = new Set<() => void>();
const cambia = () => { st.v++; iscritti.forEach((f) => f()); };
const usa = () => useSyncExternalStore((f) => (iscritti.add(f), () => void iscritti.delete(f)), () => st.v);
let nAvviso = 0, tAvviso: any = 0;

export const strati = {
  foglio(d: FoglioDati) { Keyboard.dismiss(); st.foglio = d; cambia(); },
  chiudiFoglio() { const f = st.foglio; if (!f) return; st.foglio = null; cambia(); f.alChiudere && f.alChiudere(); },
  momento(d: MomentoDati) { Keyboard.dismiss(); st.momento = d; cambia(); if (d.festa) setTimeout(strati.festa, movimentoRidotto() ? 0 : 250); },
  chiudiMomento(poi?: () => void) { const m = st.momento; if (!m) return; st.momento = null; cambia(); const f = poi || m.alChiudere; f && setTimeout(f, movimentoRidotto() ? 0 : 280); },
  avviso(t: string) { st.avviso = { t, n: ++nAvviso }; cambia(); clearTimeout(tAvviso); tAvviso = setTimeout(() => { st.avviso = null; cambia(); }, 2600); },
  festa() { if (movimentoRidotto()) return; st.festa++; cambia(); },
  /** la schermata dice se Gohan può sbucare (testata non più visibile e pagina arrivata in fondo) */
  sbuca(on: boolean, consigli?: Consiglio[]) { if (st.sbuca === on && !consigli) return; st.sbuca = on; if (consigli) st.consigli = consigli; cambia(); },
  barra(on: boolean) { if (st.barra === on) return; st.barra = on; cambia(); },
  aperto: () => !!(st.foglio || st.momento || st.avviso),
  /** il tasto Indietro di Android chiude prima quello che sta sopra */
  indietro() { if (st.momento) { strati.chiudiMomento(); return true; } if (st.foglio) { strati.chiudiFoglio(); return true; } return false; },
};
export const useBarra = () => { usa(); return st.barra; };
export const useStratoAperto = () => { usa(); return strati.aperto(); };

// ---------- avviso breve ----------
function Avviso() {
  const a = st.avviso, ins = useSafeAreaInsets();
  const v = useSharedValue(0);
  useEffect(() => { v.value = a ? (movimentoRidotto() ? withTiming(1, { duration: 100 }) : withSpring(1, MOLLA)) : withTiming(0, { duration: 200 }); }, [a && a.n]);
  const s = useAnimatedStyle(() => ({ opacity: Math.min(1, v.value * 1.4), transform: [{ translateY: (1 - v.value) * 20 }] }));
  const ultimo = useRef("");
  if (a) ultimo.current = a.t;
  return (
    <Animated.View pointerEvents="none" accessibilityLiveRegion="polite" style={[{ position: "absolute", left: 14, right: 14, bottom: (st.barra ? BARRA_H : 0) + ins.bottom + 12, backgroundColor: C.ink, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, zIndex: 45 }, s]}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.lime, overflow: "hidden" }}>
        <Image source={fermaDi("ciao")} contentFit="cover" contentPosition="top" style={{ width: 36, height: 52 }} />
      </View>
      <Text style={{ flex: 1, fontFamily: F.t700, fontSize: 14.5, lineHeight: 19, color: C.cream }}>{ultimo.current}</Text>
    </Animated.View>
  );
}

// ---------- tendina dal basso ----------
function Foglio() {
  useMotore();
  const f = st.foglio, ins = useSafeAreaInsets(), H = Dimensions.get("window").height;
  const [mostrato, setMostrato] = useState<FoglioDati | null>(f);
  const y = useSharedValue(1);
  useEffect(() => {
    if (f) { setMostrato(f); y.value = withTiming(0, movimentoRidotto() ? { duration: 100 } : { duration: 450, easing: Easing.bezier(0.16, 1, 0.3, 1) }); }
    else y.value = withTiming(1, { duration: movimentoRidotto() ? 100 : 260 }, (fine) => { if (fine) runOnJS(setMostrato)(null); });
  }, [f]);
  const sv = useAnimatedStyle(() => ({ opacity: 1 - y.value }));
  const sf = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * H }] }));
  const d = f || mostrato;
  if (!d) return null;
  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 40 }} pointerEvents={f ? "auto" : "none"}>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: C.scrim }, sv]}>
        <Pressable style={{ flex: 1 }} onPress={strati.chiudiFoglio} accessibilityLabel="Chiudi" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
        <Animated.View style={[{ maxHeight: H * (d.pieno ? 0.94 : 0.88), backgroundColor: C.cream, borderTopLeftRadius: 30, borderTopRightRadius: 30 }, sf]} accessibilityViewIsModal>
          <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: C.sage2, alignSelf: "center", marginTop: 10 }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 8, paddingBottom: 4, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Testo tipo="titolo" accessibilityRole="header">{d.titolo}</Testo>
              {d.sotto ? <Testo tipo="secondo">{d.sotto}</Testo> : null}
            </View>
            <BottoneTondo icona="x" sfondo={C.sage} onPress={strati.chiudiFoglio} accessibilityLabel="Chiudi" />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 20 + ins.bottom }} showsVerticalScrollIndicator={false}>
            {d.corpo()}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------- momento grande ----------
function Raggi({ size, chiaro }: { size: number; chiaro?: boolean }) {
  const r = useSharedValue(0), fermo = useMovimentoRidotto();
  useEffect(() => { if (!fermo) r.value = withRepeat(withTiming(360, { duration: 22000, easing: Easing.linear }), -1); }, [fermo]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: "absolute", width: size, height: size, left: "50%", top: "44%", marginLeft: -size / 2, marginTop: -size / 2 }, s]}>
      {Array.from({ length: 15 }, (_, i) => (
        <View key={i} style={{ position: "absolute", left: size / 2 - 14, top: 0, width: 28, height: size / 2, transform: [{ translateY: size / 4 }, { rotate: `${i * 24}deg` }, { translateY: -size / 4 }] }}>
          <View style={{ width: 0, height: 0, borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: size / 2, borderLeftColor: "transparent", borderRightColor: "transparent", borderTopColor: chiaro ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.14)" }} />
        </View>
      ))}
    </Animated.View>
  );
}
function Momento() {
  const m = st.momento, ins = useSafeAreaInsets();
  const [mostrato, setMostrato] = useState<MomentoDati | null>(m);
  const v = useSharedValue(0), su = useSharedValue(60);
  useEffect(() => {
    if (m) { setMostrato(m); v.value = withTiming(1, { duration: 260 }); su.value = movimentoRidotto() ? 0 : withSpring(0, MOLLA); }
    else { su.value = 60; v.value = withTiming(0, { duration: movimentoRidotto() ? 100 : 260 }, (fine) => { if (fine) runOnJS(setMostrato)(null); }); }
  }, [m]);
  const sv = useAnimatedStyle(() => ({ opacity: v.value }));
  const sc = useAnimatedStyle(() => ({ transform: [{ translateY: su.value }] }));
  const d = m || mostrato;
  if (!d) return null;
  const w = d.festa ? 206 : 180, hG = w / FORMA[d.posa], hArco = hG + 34;
  const arco = (
    <View style={{ width: w, height: hArco, marginTop: d.festa ? 0 : -0.6 * hG, borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: "hidden", backgroundColor: d.festa ? C.forest : d.caldo ? C.yellow : C.water, borderWidth: 7, borderColor: d.festa ? "rgba(255,255,255,0.6)" : C.cream }}>
      {d.festa ? <Raggi size={420} chiaro /> : null}
      {d.sole && !d.festa ? <View style={{ position: "absolute", right: 14, top: 46, width: 30, height: 30, borderRadius: 15, backgroundColor: C.yellow, borderWidth: 0 }} /> : null}
      <Mascotte posa={d.posa} attiva={!!m} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: hG }} />
    </View>
  );
  const dentro = (
    <>
      {arco}
      {d.medaglia ? <View style={{ position: "absolute", left: "50%", marginLeft: 46, top: 22 }}>{d.medaglia}</View> : null}
      {d.festa
        ? <View style={{ backgroundColor: C.ink, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: 18 }}><Text style={{ fontFamily: F.t800, fontSize: 13.5, color: C.lime, letterSpacing: 0.5, textTransform: "uppercase" }}>{d.tipo}</Text></View>
        : <Text style={{ fontFamily: F.t800, fontSize: 13.5, color: d.caldo ? "#8A4B16" : C.ink2, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 16, textAlign: "center" }}>{d.tipo}</Text>}
      <Testo tipo="momento" centro accessibilityRole="header" style={{ marginTop: 4 }}>{d.titolo}</Testo>
      {d.testo ? <Text style={{ fontFamily: F.t600, fontSize: 16, lineHeight: 22, color: d.festa ? C.ink : C.ink2, textAlign: "center", marginTop: 8, maxWidth: 300 }}>{d.testo}</Text> : null}
      {d.extra ? d.extra() : null}
      <View style={{ flexDirection: "row", gap: 8, alignSelf: "stretch", marginTop: 18 }}>
        {d.bottoni.map((b, i) => (
          <Bottone key={i} testo={b.testo} icona={b.icona} tinta={b.tinta === "chiaro2" ? (d.festa ? "chiaro" : "chiaro2") : b.tinta || "scuro"} style={{ flex: 1, alignSelf: "auto", paddingHorizontal: 10 }} onPress={() => (b.onPress ? strati.chiudiMomento(b.onPress) : strati.chiudiMomento())} />
        ))}
      </View>
      <Testo tipo="piccolo" style={{ marginTop: 10 }}>Tocca fuori per chiudere</Testo>
    </>
  );
  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 47, backgroundColor: d.festa ? C.lime : "rgba(23,28,20,0.5)", justifyContent: d.festa ? "center" : "flex-end" }, sv]} pointerEvents={m ? "auto" : "none"} accessibilityViewIsModal>
      <Pressable style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} onPress={() => strati.chiudiMomento()} accessibilityLabel="Chiudi" />
      <Animated.View style={[d.festa ? { paddingHorizontal: 24, paddingVertical: 24, alignItems: "center" } : { backgroundColor: C.cream, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingBottom: 22 + ins.bottom, alignItems: "center" }, sc]}>
        {dentro}
      </Animated.View>
    </Animated.View>
  );
}

// ---------- coriandoli ----------
const TINTE = [C.lime, C.copper, C.yellow, C.coral, C.water, C.pink, C.forest];
function Coriandolo({ i }: { i: number }) {
  const { width, height } = Dimensions.get("window");
  const p = useRef({ x0: Math.random() * width, dx: (Math.random() - 0.5) * 160, r: Math.random() * 900 - 450, d: 1400 + Math.random() * 1200, ritardo: Math.random() * 350, c: TINTE[i % TINTE.length] }).current;
  const t = useSharedValue(0);
  useEffect(() => { t.value = withDelay(p.ritardo, withTiming(1, { duration: p.d, easing: Easing.bezier(0.25, 0.6, 0.4, 1) })); }, []);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: p.dx * t.value }, { translateY: (height + 40) * t.value }, { rotate: `${p.r * t.value}deg` }] }));
  return <Animated.View style={[{ position: "absolute", top: -16, left: p.x0, width: 9, height: 14, borderRadius: 2, backgroundColor: p.c }, s]} />;
}
function Coriandoli() {
  const [n, setN] = useState(0);
  useEffect(() => { if (!st.festa) return; setN(st.festa); const t = setTimeout(() => setN(0), 3000); return () => clearTimeout(t); }, [st.festa]);
  if (!n) return null;
  return <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 48, overflow: "hidden" }}>{Array.from({ length: 60 }, (_, i) => <Coriandolo key={n + "-" + i} i={i} />)}</View>;
}

// ---------- Gohan che sbuca (basso a destra, sopra la barra del menu) ----------
function Sbuca() {
  const ins = useSafeAreaInsets();
  // toccandolo Gohan se ne va, così si legge quello che c'è sotto; torna la prossima volta che si arriva in fondo
  const [via, setVia] = useState(false);
  useEffect(() => { if (!st.sbuca) setVia(false); }, [st.sbuca]);
  const visibile = st.sbuca && st.barra && !strati.aperto() && !via;
  const y = useSharedValue(1), salto = useSharedValue(0);
  const [bolla, setBolla] = useState<Consiglio | null>(null);
  const giro = useRef(0), tB = useRef<any>(0);
  useEffect(() => {
    y.value = visibile ? (movimentoRidotto() ? withTiming(0, { duration: 100 }) : withSpring(0, { damping: 11, stiffness: 120 })) : withTiming(1, { duration: movimentoRidotto() ? 100 : 380, easing: Easing.bezier(0.16, 1, 0.3, 1) });
    if (!visibile) { clearTimeout(tB.current); setBolla(null); }
  }, [visibile]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.value * 158 + salto.value }] }));
  const tocca = () => {
    clearTimeout(tB.current);
    setBolla(null);
    setVia(true);
  };
  const base = BARRA_H + ins.bottom - 6;
  return (
    <>
      <View pointerEvents="box-none" style={{ position: "absolute", right: 0, bottom: base, width: 122, height: 152, overflow: "hidden", zIndex: 19 }}>
        <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }, s]} pointerEvents={visibile ? "auto" : "none"}>
          <Mascotte posa="sbuca" attiva={visibile} allinea="bottom right" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <Pressable onPress={tocca} accessibilityRole="button" accessibilityLabel="Tocca Gohan per farlo andare via" style={{ position: "absolute", left: 10, right: 0, top: 16, bottom: 6 }} />
        </Animated.View>
      </View>
      {bolla ? (
        <Tocco onPress={() => setBolla(null)} style={[{ position: "absolute", right: 14, bottom: base + 158, maxWidth: 250, zIndex: 21, backgroundColor: C.ink, borderRadius: 18, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 12 }, OMBRA]}>
          <Text style={{ fontFamily: F.t800, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", color: C.lime, marginBottom: 2 }}>{bolla.titolo}</Text>
          <Text style={{ fontFamily: F.t700, fontSize: 14.5, lineHeight: 19, color: C.cream }}>{bolla.testo}</Text>
        </Tocco>
      ) : null}
    </>
  );
}

/** da mettere una volta sola, sopra a tutte le schermate */
export function Strati() {
  usa();
  useEffect(() => quandoAvvisa((t) => strati.avviso(t)), []);
  useEffect(() => { const s = BackHandler.addEventListener("hardwareBackPress", () => strati.indietro()); return () => s.remove(); }, []);
  return (
    <>
      <Sbuca />
      <Foglio />
      <Avviso />
      <Momento />
      <Coriandoli />
    </>
  );
}

/** fila di pastiglie dentro un momento (meteo, salita, acqua…) */
export function PastiglieMomento({ voci }: { voci: { icona: string; testo: string; caldo?: boolean }[] }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 14 }}>
      {voci.map((x, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: x.caldo ? "#FBD9C9" : C.sage, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
          <Icona nome={x.icona} size={16} />
          <Text style={{ fontFamily: F.t800, fontSize: 14, color: C.ink, fontVariant: ["tabular-nums"] }}>{x.testo}</Text>
        </View>
      ))}
    </View>
  );
}
