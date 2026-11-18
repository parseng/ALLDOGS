// ALLDOGS: app nativa con il nuovo design. Le regole (verdetti, limiti del cane, meteo…) sono quelle del sito,
// eseguite dal "motore" (src/motore); le schermate sono tutte native (src/schermate).
import React, { useEffect, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { BricolageGrotesque_800ExtraBold } from "@expo-google-fonts/bricolage-grotesque";
import { Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold } from "@expo-google-fonts/urbanist";
import Animated, { FadeIn, ReduceMotion, ReducedMotionConfig } from "react-native-reanimated";
import { caricaArchivio } from "./src/archivio";
import { avviaMotore, generazioneMotore, motore, useMotore } from "./src/motore";
import { C } from "./src/theme";
import { PIENE, cima, nav, useNav } from "./src/nav";
import { BarraMenu } from "./src/ui/BarraMenu";
import { Strati, strati, useBarra } from "./src/ui/strati";
import { PrimoAvvio } from "./src/schermate/PrimoAvvio";
import { SEZIONI, SCHERMATE } from "./src/schermate";
import "./src/collega";
import "./src/pericoli";
import "./src/parchi";
import "./src/obiettivoChat";
import { PastigliaInCammino } from "./src/schermate/Vai";
import { salutoDelGiorno } from "./src/schermate/Esplora";

function Radice() {
  useMotore();
  const st = useNav();
  const M = motore();
  const [viste, setViste] = useState<Record<string, boolean>>({ esplora: true });
  useEffect(() => { if (!viste[st.sezione]) setViste((v) => ({ ...v, [st.sezione]: true })); }, [st.sezione]);
  useEffect(() => {
    const s = BackHandler.addEventListener("hardwareBackPress", () => strati.indietro() || nav.indietro());
    return () => s.remove();
  }, []);
  const c = cima(), barra = useBarra();
  useEffect(() => { if (M.S.dog && !M.nav) salutoDelGiorno(); }, [!!M.S.dog]);
  useEffect(() => { strati.barra(!PIENE.has(c.nome)); }, [c.nome]);
  if (!M.S.dog) return <PrimoAvvio />;
  return (
    <View style={{ flex: 1, backgroundColor: C.sage }}>
      {Object.entries(SEZIONI).map(([k, Comp]) => (viste[k] || st.sezione === k ? (
        <View key={k} collapsable={false} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 1, display: st.sezione === k && !st.pila.length ? "flex" : "none" }}>
          <Comp attiva={st.sezione === k && !st.pila.length} />
        </View>
      ) : null))}
      {st.pila.map((s, i) => {
        const Comp = SCHERMATE[s.nome];
        if (!Comp) return null;
        return (
          <Animated.View key={s.nome + ":" + (s.arg ?? "") + ":" + i} entering={FadeIn.duration(220)} collapsable={false} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 2 + i, backgroundColor: C.sage, display: i === st.pila.length - 1 ? "flex" : "none" }}>
            <Comp arg={s.arg} attiva={i === st.pila.length - 1} />
          </Animated.View>
        );
      })}
      {barra && !PIENE.has(c.nome) ? <PastigliaInCammino /> : null}
      <BarraMenu visibile={barra && !PIENE.has(c.nome)} />
      <Strati />
    </View>
  );
}

export default function App() {
  const [font] = useFonts({ BricolageGrotesque_800ExtraBold, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold });
  const [pronto, setPronto] = useState(false);
  const [errore, setErrore] = useState("");
  useEffect(() => {
    caricaArchivio().then(() => { avviaMotore(); setPronto(true); }).catch((e) => setErrore(String((e && (e.stack || e.message)) || e).split(String.fromCharCode(10)).slice(0, 4).join(String.fromCharCode(10))));
  }, []);
  useMotore();
  return (
    <SafeAreaProvider>
      <ReducedMotionConfig mode={ReduceMotion.Never} />
      <StatusBar style="dark" />
      {font && pronto ? <Radice key={generazioneMotore()} /> : (
        <View style={{ flex: 1, backgroundColor: C.sage, alignItems: "center", justifyContent: "center", padding: 24 }}>
          {errore ? <Text style={{ color: C.ink, textAlign: "center" }}>L'app non riesce a partire: {errore}</Text> : null}
        </View>
      )}
    </SafeAreaProvider>
  );
}
