// Mappa "che galleggia" sopra una pagina che scorre: segue il suo posto nella pagina e, a tutto schermo, occupa tutto.
// Così la mappa resta sempre la stessa (non si ricarica) e i tocchi sulla mappa non fanno scorrere la pagina.
import React, { useEffect } from "react";
import { Dimensions, StyleProp, Text, View, ViewStyle } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F } from "../theme";
import { motore, pagina, useMotore } from "../motore";
import { BottoneTondo } from "../ui/base";
import { strati } from "../ui/strati";
import { Mappa, StatoVolo } from "./Mappa";
import { foglioMappe } from "./fogli";

const W = Dimensions.get("window").width, H = Dimensions.get("window").height;

export function MappaGalleggiante({ attiva, y, slotY, altezza, margine = 0, raggio = 0, piena, onPiena, conPiena = true, sopra, sotto, bottoniExtra, onVolo, legendaSu, scala, proponi, nascosta }: {
  attiva: boolean; y: SharedValue<number>; slotY: SharedValue<number>; altezza: number; margine?: number; raggio?: number;
  piena: boolean; onPiena: (on: boolean) => void; conPiena?: boolean;
  /** cose disegnate sopra la mappa (anteprima del sentiero, barra del volo…) */
  sopra?: (piena: boolean) => React.ReactNode; sotto?: React.ReactNode; bottoniExtra?: (piena: boolean) => React.ReactNode;
  onVolo?: (s: StatoVolo) => void; legendaSu?: number; scala?: "su" | "giu" | "no"; proponi?: () => void; nascosta?: boolean;
}) {
  const ins = useSafeAreaInsets(), M = motore();
  const s = useAnimatedStyle(() => (piena
    ? { transform: [{ translateY: 0 }], left: 0, width: W, height: H, borderRadius: 0 }
    : { transform: [{ translateY: slotY.value - y.value }], left: margine, width: W - margine * 2, height: altezza, borderRadius: raggio }), [piena, altezza, margine, raggio]);
  useEffect(() => { if (!attiva && piena) onPiena(false); }, [attiva]);
  return (
    <Animated.View pointerEvents={nascosta ? "none" : "auto"} style={[{ position: "absolute", top: 0, overflow: "hidden", backgroundColor: C.sage2, zIndex: piena ? 30 : 1, opacity: nascosta ? 0 : 1 }, s]}>
      <Mappa attiva={attiva} style={{ flex: 1 }} legendaSu={legendaSu} scala={scala} onVolo={onVolo} />
      <View style={{ position: "absolute", right: 10, top: piena || !margine ? ins.top + 10 : 10, gap: 8 }}>
        {conPiena ? <BottoneTondo icona={piena ? "shrink" : "expand"} ombra onPress={() => onPiena(!piena)} accessibilityLabel={piena ? "Riduci la mappa" : "Mappa a tutto schermo"} /> : null}
        <BottoneTondo icona="layers" ombra onPress={() => foglioMappe({ proponi })} accessibilityLabel="Scegli la mappa" />
        <BottoneTondo icona="nav" ombra onPress={() => { try { M.$("m-loc").click(); } catch {} }} accessibilityLabel="Mostra dove sono" />
        {bottoniExtra ? bottoniExtra(piena) : null}
      </View>
      <LegendaFondo />
      {sopra ? sopra(piena) : null}
    </Animated.View>
  );
}

/** c'è un fondo da colorare sulla mappa? (sentiero aperto con i dati del fondo, o giro creato) */
export function fondoDisponibile(): any {
  try {
    const M = motore(), sc = M.scene, r = M.S.gen && M.S.gen[M.S.genIdx];
    if (sc.mode === "trail" && sc.sf) { const tr = M.cur && M.cur.tr; return (tr && M.surfShare(tr)) || {}; }
    if (sc.mode === "crea" && r && r.segs && r.segs.length) return M.segShare(r.segs) || {};
  } catch {}
  return null;
}

/** con "Colora il fondo" acceso: la barra che spiega i colori, con quanto ce n'è di ciascuno */
function LegendaFondo() {
  useMotore();
  const M = motore();
  const sh = M && M.surfOn ? fondoDisponibile() : null;
  if (!sh) return null;
  const voci = (M.SFK as string[]).filter((k) => sh[k] == null || sh[k] >= 0.005);
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 10, bottom: 70, maxWidth: W - 90, backgroundColor: "rgba(250,246,236,0.95)", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", flexWrap: "wrap", columnGap: 10, rowGap: 4 }}>
      {voci.map((k) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
          <View style={{ width: 14, height: 5, borderRadius: 3, backgroundColor: M.SFC[k], borderWidth: k === "u" ? 1 : 0, borderColor: C.ink2 }} />
          <Text style={{ fontFamily: F.t700, fontSize: 12, color: C.ink }}>{M.SFL[k]}{sh[k] != null ? ` ${Math.round(sh[k] * 100)}%` : ""}</Text>
        </View>
      ))}
    </View>
  );
}

/** "mappa a tutto schermo" di una schermata: lo stato è quello del motore (che a volte lo cambia da solo, es. toccando la mappa del sentiero) */
export function usePiena(host: string, attiva: boolean): [boolean, (on: boolean) => void] {
  useMotore();
  let piena = false;
  try { piena = attiva && pagina().el(host).classList.contains("full"); } catch {}
  useEffect(() => {
    if (attiva) strati.barra(!piena);
    else { try { pagina().el(host).classList.remove("full"); } catch {} } // uscendo dalla schermata la mappa torna piccola
  }, [piena, attiva]);
  const cambia = (on: boolean) => { try { motore().setFull(on); } catch {} };
  return [piena, cambia];
}
