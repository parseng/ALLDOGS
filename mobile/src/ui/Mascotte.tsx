// La mascotte animata. Ogni posto dove sta (testata, sbuca, cerchietto, momento) ha una posa:
// cambiare posa = immagine nuova sopra la vecchia, dissolvenza di 180 ms, poi la vecchia si toglie.
// Si muove sempre, anche con "Riduci movimento" acceso (le immagini ferme restano per usi futuri).
import React, { useEffect, useRef, useState } from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Asset } from "expo-asset";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export type Posa = "esplora" | "creagiro" | "attivita" | "salvati" | "allenati" | "salute" | "sbuca" | "ciao" | "felice" | "preoccupato" | "intro" | "loop";

const VIVE: Record<Posa, any> = {
  esplora: require("../../assets/mascotte/gohan-esplora.webp"),
  creagiro: require("../../assets/mascotte/gohan-creagiro.webp"),
  attivita: require("../../assets/mascotte/gohan-attivita.webp"),
  salvati: require("../../assets/mascotte/gohan-salvati.webp"),
  allenati: require("../../assets/mascotte/gohan-allenati.webp"),
  salute: require("../../assets/mascotte/gohan-salute.webp"),
  sbuca: require("../../assets/mascotte/gohan-sbuca.webp"),
  ciao: require("../../assets/mascotte/gohan-ciao.webp"),
  felice: require("../../assets/mascotte/gohan-felice.webp"),
  preoccupato: require("../../assets/mascotte/gohan-preoccupato.webp"),
  intro: require("../../assets/mascotte/gohan-intro.webp"),
  loop: require("../../assets/mascotte/gohan-loop.webp"),
};
const FERME: Partial<Record<Posa, any>> = {
  esplora: require("../../assets/mascotte/gohan-esplora-fermo.webp"),
  creagiro: require("../../assets/mascotte/gohan-creagiro-fermo.webp"),
  attivita: require("../../assets/mascotte/gohan-attivita-fermo.webp"),
  salvati: require("../../assets/mascotte/gohan-salvati-fermo.webp"),
  allenati: require("../../assets/mascotte/gohan-allenati-fermo.webp"),
  salute: require("../../assets/mascotte/gohan-salute-fermo.webp"),
  sbuca: require("../../assets/mascotte/gohan-sbuca-fermo.webp"),
  ciao: require("../../assets/mascotte/gohan-ciao-fermo.webp"),
  felice: require("../../assets/mascotte/gohan-felice-fermo.webp"),
  preoccupato: require("../../assets/mascotte/gohan-preoccupato-fermo.webp"),
};
/** larghezza / altezza di ogni animazione */
export const FORMA: Record<Posa, number> = { sbuca: 580 / 720, ciao: 468 / 720, felice: 432 / 720, preoccupato: 420 / 720, esplora: 412 / 720, creagiro: 478 / 720, attivita: 470 / 720, salvati: 500 / 720, allenati: 404 / 720, salute: 422 / 720, intro: 432 / 720, loop: 432 / 720 };
export const fermaDi = (p: Posa) => FERME[p] || FERME.ciao;

/** precarica le animazioni usate per prime (Esplora e i momenti) */
export function precaricaMascotte(pose: Posa[] = ["esplora", "sbuca", "ciao", "felice"]) {
  return Asset.loadAsync(pose.map((p) => VIVE[p])).catch(() => {});
}

function Livello({ posa, visibile, attiva, ferma, allinea, quandoPronto }: { posa: Posa; visibile: boolean; attiva: boolean; ferma: boolean; allinea: "bottom" | "bottom right"; quandoPronto?: () => void }) {
  const o = useSharedValue(0);
  useEffect(() => { o.value = withTiming(visibile ? 1 : 0, { duration: 180 }); }, [visibile]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }, st]} pointerEvents="none">
      <Image
        source={ferma ? fermaDi(posa) : VIVE[posa]}
        autoplay={attiva && !ferma}
        useAppleWebpCodec={false}
        allowDownscaling={false}
        contentFit="contain"
        contentPosition={allinea}
        cachePolicy="memory-disk"
        onLoad={quandoPronto}
        onError={quandoPronto}
        style={{ width: "100%", height: "100%" }}
        accessible={false}
      />
    </Animated.View>
  );
}

export function Mascotte({ posa, attiva = true, style, allinea = "bottom" }: { posa: Posa; attiva?: boolean; style?: StyleProp<ViewStyle>; allinea?: "bottom" | "bottom right" }) {
  // la mascotte si muove sempre: prima con "Riduci movimento" acceso su iPhone restava ferma, e non si può chiedere
  // a chi usa l'app di cambiare le impostazioni del telefono (è un movimento lento e tranquillo, senza lampi)
  const ferma = false;
  const [livelli, setLivelli] = useState<{ k: number; posa: Posa; pronto: boolean }[]>([{ k: 0, posa, pronto: true }]);
  const n = useRef(0);
  useEffect(() => {
    setLivelli((L) => {
      if (L[L.length - 1].posa === posa) return L;
      const k = ++n.current;
      // se l'immagine nuova non è pronta entro 700 ms, si mostra comunque
      setTimeout(() => pronto(k), 700);
      return [...L.slice(-1), { k, posa, pronto: false }];
    });
  }, [posa]);
  const pronto = (k: number) => {
    setLivelli((L) => {
      const i = L.findIndex((x) => x.k === k);
      if (i < 0 || L[i].pronto) return L;
      const N = L.map((x) => (x.k === k ? { ...x, pronto: true } : x));
      setTimeout(() => setLivelli((Z) => (Z.length > 1 && Z[Z.length - 1].k === k ? Z.slice(-1) : Z)), 220);
      return N;
    });
  };
  const ultimo = livelli[livelli.length - 1];
  return (
    <View style={style} pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants">
      {livelli.map((l) => (
        <Livello key={l.k} posa={l.posa} ferma={ferma} attiva={attiva} allinea={allinea} visibile={l === ultimo ? l.pronto : !ultimo.pronto} quandoPronto={() => pronto(l.k)} />
      ))}
    </View>
  );
}
