// Testate e impalcatura delle pagine.
// - PaginaGrande: testata a colore pieno con titolo, nuvoletta e Gohan animato a destra. Scorrendo la testata
//   si richiude in modo continuo (Gohan rimpicciolisce e sparisce): la pagina sotto non cambia altezza,
//   quindi non può "tornare su" e riaprirsi a scatti.
// - PaginaSemplice: testata a colore pieno con freccia indietro, titolo e una riga. Senza mascotte.
import React, { useCallback, useEffect, useRef } from "react";
import { RefreshControlProps, StyleProp, Text, View, ViewStyle } from "react-native";
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BARRA_H, C, F, MARGINE, MOLLA } from "../theme";
import { BottoneTondo, Testo, movimentoRidotto } from "./base";
import { Mascotte, Posa } from "./Mascotte";
import { strati, useStratoAperto } from "./strati";

export function Nuvoletta({ testo, style }: { testo: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: C.cream, borderRadius: 16, borderBottomRightRadius: 4, paddingVertical: 8, paddingHorizontal: 12, alignSelf: "flex-start" }, style]}>
      <Text style={{ fontFamily: F.t700, fontSize: 14.5, lineHeight: 19, color: C.ink }}>{testo}</Text>
    </View>
  );
}

type Consiglio = { titolo: string; testo: string };
type GrandeProps = {
  colore: string; titolo: string; frase: string; posa: Posa;
  /** la schermata è quella che si vede adesso */
  attiva: boolean;
  /** Gohan può sbucare in fondo alla pagina (solo Esplora, Crea giro, Attività) */
  sbuca?: boolean; consigli?: Consiglio[];
  /** spazio in più in fondo (es. per il cerchietto "Chiedi a Gohan") */
  fondo?: number;
  children: React.ReactNode;
  /** contenuto fisso sotto la testata (es. i segmenti) */
  refresh?: React.ReactElement<RefreshControlProps>;
  scrollRef?: React.RefObject<Animated.ScrollView | null>;
};

export function PaginaGrande({ colore, titolo, frase, posa, attiva, sbuca, consigli, fondo = 0, children, refresh, scrollRef }: GrandeProps) {
  const ins = useSafeAreaInsets();
  const APERTA = 150 + ins.top + 16, CHIUSA = ins.top + 52, CORSA = APERTA - CHIUSA;
  const y = useSharedValue(0), inFondo = useSharedValue(0), entra = useSharedValue(0);
  const aperto = useStratoAperto();

  useEffect(() => { if (attiva) { entra.value = 0; entra.value = movimentoRidotto() ? 1 : withSpring(1, MOLLA); } }, [attiva]);

  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
    const max = e.contentSize.height - e.layoutMeasurement.height;
    inFondo.value = max > 20 && e.contentOffset.y >= max - 40 && e.contentOffset.y >= CORSA ? 1 : 0;
  });
  const dillo = useCallback((on: boolean) => strati.sbuca(on, consigli), [consigli]);
  useAnimatedReaction(() => inFondo.value, (v, prima) => { if (v !== prima) runOnJS(dillo)(!!v && !!sbuca && attiva); }, [sbuca, attiva, dillo]);
  useEffect(() => { if (!attiva) return; strati.sbuca(!!sbuca && inFondo.value === 1, consigli); return () => strati.sbuca(false); }, [attiva, sbuca]);

  const sTesta = useAnimatedStyle(() => ({ height: interpolate(y.value, [0, CORSA], [APERTA, CHIUSA], Extrapolation.CLAMP) + Math.max(0, -y.value) }));
  const sOmbra = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [CORSA - 10, CORSA + 10], [0, 1], Extrapolation.CLAMP) }));
  const sTitolo = useAnimatedStyle(() => ({ fontSize: interpolate(y.value, [0, CORSA], [31, 24], Extrapolation.CLAMP), lineHeight: interpolate(y.value, [0, CORSA], [32, 26], Extrapolation.CLAMP), marginTop: interpolate(y.value, [0, CORSA], [16, 10], Extrapolation.CLAMP) }));
  const sFrase = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [0, 46], [1, 0], Extrapolation.CLAMP), transform: [{ translateY: interpolate(y.value, [0, 70], [0, -10], Extrapolation.CLAMP) }] }));
  const sCane = useAnimatedStyle(() => {
    const k = Math.min(1, Math.max(0, y.value / 90)), sc = (1 - k * 0.62) * (0.9 + 0.1 * entra.value);
    // si rimpicciolisce verso il basso a destra, come nel prototipo (origine 72% 100%)
    return { opacity: Math.max(0, Math.min(1, 1.2 - k * 1.35)) * Math.min(1, entra.value * 1.5), transform: [{ translateY: k * 40 + (1 - entra.value) * 46 + (184 * (1 - sc)) / 2 }, { translateX: (150 * 0.22 * (1 - sc)) }, { scale: sc }] };
  });

  return (
    <View style={{ flex: 1, backgroundColor: C.sage }}>
      <Animated.ScrollView
        ref={scrollRef as any}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={refresh}
        contentContainerStyle={{ paddingTop: APERTA, paddingBottom: BARRA_H + ins.bottom + 28 + fondo }}
      >
        {children}
      </Animated.ScrollView>
      <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, backgroundColor: colore, overflow: "hidden", paddingHorizontal: MARGINE, paddingTop: ins.top, justifyContent: "flex-start" }, sTesta]}>
        <View style={{ paddingRight: 140 }}>
          <Animated.Text accessibilityRole="header" numberOfLines={2} style={[{ fontFamily: F.titolo, color: C.ink, letterSpacing: -0.9 }, sTitolo]}>{titolo}</Animated.Text>
          <Animated.View style={[{ marginTop: 12 }, sFrase]}><Nuvoletta testo={frase} /></Animated.View>
        </View>
        <Animated.View style={[{ position: "absolute", right: 0, bottom: 0, width: 150, height: 184 }, sCane]} pointerEvents="none">
          <Mascotte posa={posa} attiva={attiva && !aperto} style={{ width: 150, height: 184 }} />
        </Animated.View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", left: 0, right: 0, top: CHIUSA, height: 8 }, sOmbra]}>
        <View style={{ height: 1, backgroundColor: "rgba(23,28,20,0.12)" }} />
      </Animated.View>
    </View>
  );
}

export function TestataSemplice({ colore, titolo, riga, indietro, scuro }: { colore: string; titolo: string; riga?: string; indietro?: () => void; scuro?: boolean }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ backgroundColor: colore, paddingTop: ins.top + 8, paddingHorizontal: MARGINE, paddingBottom: 18 }}>
      {indietro ? <BottoneTondo icona="back" sfondo="rgba(255,255,255,0.55)" onPress={indietro} accessibilityLabel="Indietro" style={{ marginLeft: -8 }} /> : <View style={{ height: 8 }} />}
      <Testo tipo="testata" accessibilityRole="header" colore={scuro ? C.cream : C.ink} style={{ marginTop: 8 }}>{titolo}</Testo>
      {riga ? <Text style={{ fontFamily: F.t600, fontSize: 16, lineHeight: 22, color: scuro ? C.onForest2 : C.ink2, marginTop: 6 }}>{riga}</Text> : null}
    </View>
  );
}

export function PaginaSemplice({ colore, titolo, riga, indietro, children, conBarra = true, fisso }: { colore: string; titolo: string; riga?: string; indietro?: () => void; children: React.ReactNode; conBarra?: boolean; fisso?: React.ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.sage }}>
      <Animated.ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: (conBarra ? BARRA_H : 0) + ins.bottom + 28 }}>
        <TestataSemplice colore={colore} titolo={titolo} riga={riga} indietro={indietro} />
        <View style={{ paddingHorizontal: MARGINE }}>{children}</View>
      </Animated.ScrollView>
      {fisso}
    </View>
  );
}

/** barra in alto delle schermate a tutto schermo (ricerca, filtri, modifica) */
export function BarraAlta({ titolo, indietro, icona = "back", destra, children }: { titolo?: string; indietro: () => void; icona?: string; destra?: React.ReactNode; children?: React.ReactNode }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: ins.top + 8, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: C.sage }}>
      <BottoneTondo icona={icona} onPress={indietro} accessibilityLabel={icona === "x" ? "Chiudi" : "Indietro"} />
      {titolo ? <Testo tipo="titolo" accessibilityRole="header" style={{ flex: 1 }}>{titolo}</Testo> : null}
      {children}
      {destra}
    </View>
  );
}
