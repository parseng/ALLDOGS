// Barra del menu in basso: Esplora, Attività, + Crea giro, Allenati, e la foto del cane.
import React, { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BARRA_H, C, F, MOLLA, OMBRA } from "../theme";
import { motore, useMotore } from "../motore";
import { Sezione, nav, useNav } from "../nav";
import { Icona, movimentoRidotto } from "./base";

/** foto del cane scelto (o null) */
export function fotoCane(id?: string): string | null {
  const M = motore();
  try { return id ? M.phOf(id) : M.store.get(M.PHK); } catch { return null; }
}
export function nomeCane(): string {
  const M = motore();
  return (M && M.S.dog && String(M.S.dog.name || "").trim()) || "Il mio cane";
}
export function FotoCane({ size, id, anello }: { size: number; id?: string; anello?: string }) {
  const ph = fotoCane(id), n = nomeCane();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.pink, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: anello ? 2 : 0, borderColor: anello }}>
      {ph ? <Image source={{ uri: ph }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : <Text style={{ fontFamily: F.titolo, fontSize: size * 0.42, color: C.ink }}>{n.charAt(0).toUpperCase()}</Text>}
    </View>
  );
}

function Voce({ attiva, etichetta, onPress, children }: { attiva: boolean; etichetta: string; onPress: () => void; children: React.ReactNode }) {
  const p = useSharedValue(attiva ? 1 : 0);
  useEffect(() => { p.value = attiva ? (movimentoRidotto() ? 1 : withSpring(1, MOLLA)) : withTiming(0, { duration: 160 }); }, [attiva]);
  const s = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: 0.4 + 0.6 * p.value }] }));
  return (
    <Pressable onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: attiva }} accessibilityLabel={etichetta} style={{ flex: 1, alignItems: "center", paddingTop: 4, minHeight: 56 }}>
      <Animated.View style={[{ position: "absolute", top: 0, width: 52, height: 32, borderRadius: 16, backgroundColor: C.lime }, s]} />
      <View style={{ height: 28, justifyContent: "center" }}>{children}</View>
      <Text numberOfLines={1} style={{ fontFamily: F.t700, fontSize: 12, color: attiva ? C.ink : C.ink2, marginTop: 3 }}>{etichetta}</Text>
    </Pressable>
  );
}

export function BarraMenu({ visibile }: { visibile: boolean }) {
  useMotore();
  const st = useNav(), ins = useSafeAreaInsets();
  const giu = useSharedValue(0), giro = useSharedValue(0);
  const crea = st.sezione === "crea";
  useEffect(() => { giu.value = withTiming(visibile ? 0 : 1, { duration: movimentoRidotto() ? 100 : 320 }); }, [visibile]);
  useEffect(() => { giro.value = movimentoRidotto() ? (crea ? 1 : 0) : withSpring(crea ? 1 : 0, MOLLA); }, [crea]);
  const sBarra = useAnimatedStyle(() => ({ transform: [{ translateY: giu.value * (BARRA_H + ins.bottom + 30) }], opacity: 1 - giu.value }));
  const sPiu = useAnimatedStyle(() => ({ transform: [{ rotate: `${giro.value * 90}deg` }] }));
  const vai = (s: Sezione) => () => nav.sezione(s);
  const col = (s: Sezione) => (st.sezione === s ? C.ink : C.ink2);
  return (
    <Animated.View pointerEvents={visibile ? "auto" : "none"} accessibilityRole="tablist" style={[{ position: "absolute", left: 0, right: 0, bottom: 0, height: BARRA_H + ins.bottom, paddingBottom: ins.bottom, backgroundColor: C.cream, borderTopWidth: 1, borderTopColor: C.sage2, flexDirection: "row", alignItems: "flex-start", paddingTop: 8, paddingHorizontal: 6, zIndex: 20 }, sBarra]}>
      <Voce attiva={st.sezione === "esplora"} etichetta="Esplora" onPress={vai("esplora")}><Icona nome="search" colore={col("esplora")} /></Voce>
      <Voce attiva={st.sezione === "attivita"} etichetta="Attività" onPress={vai("attivita")}><Icona nome="route" colore={col("attivita")} /></Voce>
      <Pressable onPress={vai("crea")} accessibilityRole="tab" accessibilityState={{ selected: crea }} accessibilityLabel="Crea giro" style={{ flex: 1, alignItems: "center" }}>
        <Animated.View style={[{ width: 56, height: 56, marginTop: -22, borderRadius: 20, backgroundColor: crea ? C.lime : C.copper, alignItems: "center", justifyContent: "center" }, OMBRA, sPiu]}>
          <Icona nome="plus" size={28} />
        </Animated.View>
        <Text style={{ fontFamily: F.t700, fontSize: 12, color: C.ink, marginTop: 3 }}>Crea giro</Text>
      </Pressable>
      <Voce attiva={st.sezione === "allenati"} etichetta="Allenati" onPress={vai("allenati")}><Icona nome="trend" colore={col("allenati")} /></Voce>
      <Voce attiva={st.sezione === "cane"} etichetta={nomeCane()} onPress={vai("cane")}>
        <View style={{ borderRadius: 18, borderWidth: 1.5, borderColor: st.sezione === "cane" ? C.ink : C.ink2, padding: 2 }}><FotoCane size={26} /></View>
      </Voce>
    </Animated.View>
  );
}
