// Allenati: Obiettivi (programma prudente con calendario) e Addestramento (lezione del giorno, passi, lezioni imparate).
// Il contenuto lo prepara il motore come nel sito; qui è disegnato con lo stile nuovo.
// In basso a destra, fisso, il cerchietto "Chiedi a Gohan" che apre la chat (allenatore o educatore).
import React, { useEffect, useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BARRA_H, C, F, MARGINE, MOLLA, OMBRA, TESTATA } from "../theme";
import { motore, pulito, useMotore } from "../motore";
import { leggi, scrivi } from "../archivio";
import { nav, useNav } from "../nav";
import { Bottone, Chip, Segmenti, Testo, Tocco, movimentoRidotto } from "../ui/base";
import { FotoCane, nomeCane } from "../ui/BarraMenu";
import { Mascotte } from "../ui/Mascotte";
import { PaginaGrande } from "../ui/Testate";
import { PaginaMotore } from "../ui/PaginaMotore";
import { strati, useStratoAperto } from "../ui/strati";

function ChatMini({ host }: { host: string }) {
  useMotore();
  const M = motore();
  const [t, setT] = useState("");
  const id = Object.keys(M.MC).find((k) => M.MC[k].cfg && M.MC[k].cfg.host === host);
  const c = id ? M.MC[id] : null;
  if (!c || !id) return <Testo tipo="secondo">Un attimo…</Testo>;
  const manda = (x: string) => { if (!x.trim() || c.busy) return; setT(""); M.miniSend(id, x); };
  const sugg = c.msgs.length <= 1 ? (c.cfg.sugg() as string[]) : [];
  return (
    <View>
      <View style={{ gap: 10, marginTop: 6 }}>
        {c.msgs.map((m: any, i: number) => (m.r === "u"
          ? <View key={i} style={{ alignSelf: "flex-end", maxWidth: "84%", backgroundColor: C.ink, borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 11, paddingHorizontal: 14 }}><Text style={{ fontFamily: F.t600, fontSize: 15, lineHeight: 20, color: C.cream }}>{m.t}</Text></View>
          : <View key={i} style={{ alignSelf: "flex-start", maxWidth: "88%", backgroundColor: m.err ? "#FBD9C9" : C.sage, borderRadius: 20, borderBottomLeftRadius: 6, paddingVertical: 11, paddingHorizontal: 14, flexDirection: "row", gap: 8 }}><FotoCane size={32} /><Text style={{ flex: 1, fontFamily: F.t600, fontSize: 15, lineHeight: 20, color: C.ink }}>{pulito(m.t)}</Text></View>))}
        {c.busy ? <View style={{ alignSelf: "flex-start", backgroundColor: C.sage, borderRadius: 20, paddingVertical: 11, paddingHorizontal: 14 }}><Text style={{ fontFamily: F.t600, fontSize: 15, color: C.ink2 }}>Sto pensando…</Text></View> : null}
      </View>
      {sugg.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>{sugg.map((s) => <Chip key={s} piccolo sfondo={C.white} testo={s} onPress={() => manda(s)} />)}</View> : null}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <TextInput value={t} onChangeText={setT} onSubmitEditing={() => manda(t)} returnKeyType="send" placeholder={c.cfg.ph} placeholderTextColor={C.ink2} style={{ flex: 1, height: 52, borderRadius: 18, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.sage2, paddingHorizontal: 16, fontFamily: F.t600, fontSize: 15.5, color: C.ink }} accessibilityLabel="Scrivi a Gohan" />
        <Bottone icona="send" tinta="scuro" onPress={() => manda(t)} accessibilityLabel="Invia" style={{ width: 52 }} />
      </View>
      <Testo tipo="piccolo" style={{ marginTop: 10 }}>Usa Gemini di Google e riceve il profilo del cane (senza veterinario né microchip). Può sbagliare.</Testo>
    </View>
  );
}

/** cerchietto lime fisso in basso a destra: Gohan sbuca dentro e apre la chat */
function ChiediAGohan({ attivo, onPress }: { attivo: boolean; onPress: () => void }) {
  const ins = useSafeAreaInsets(), aperto = useStratoAperto();
  const v = useSharedValue(0), et = useSharedValue(0);
  const on = attivo && !aperto;
  const [etichetta, setEt] = useState(false);
  useEffect(() => {
    v.value = on ? (movimentoRidotto() ? withTiming(1, { duration: 100 }) : withSpring(1, MOLLA)) : withTiming(0, { duration: 200 });
    if (on && !leggi("ad-gc-tip")) {
      scrivi("ad-gc-tip", 1); setEt(true);
      et.value = withDelay(500, withTiming(1, { duration: 250 }));
      const t = setTimeout(() => { et.value = withTiming(0, { duration: 250 }); setTimeout(() => setEt(false), 300); }, 5000);
      return () => clearTimeout(t);
    }
  }, [on]);
  const s = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.6 + 0.4 * v.value }] }));
  const se = useAnimatedStyle(() => ({ opacity: et.value, transform: [{ translateX: (1 - et.value) * 6 }] }));
  return (
    <Animated.View pointerEvents={on ? "box-none" : "none"} style={[{ position: "absolute", right: 12, bottom: BARRA_H + ins.bottom + 10, zIndex: 19, flexDirection: "row", alignItems: "center", gap: 10 }, s]}>
      {etichetta ? <Animated.View style={[{ backgroundColor: C.ink, borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 12, paddingVertical: 8 }, se]}><Text style={{ fontFamily: F.t800, fontSize: 14, color: C.cream }}>Chiedi a Gohan</Text></Animated.View> : null}
      <Tocco onPress={onPress} accessibilityLabel="Chiedi a Gohan" style={[{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.lime, overflow: "hidden", borderWidth: 2, borderColor: C.cream }, OMBRA]}>
        <Mascotte posa="sbuca" attiva={on} style={{ position: "absolute", left: -4, right: -4, bottom: -4, height: 70 }} />
      </Tocco>
    </Animated.View>
  );
}

export function Allenati({ attiva }: { attiva: boolean }) {
  useMotore();
  const st = useNav(), M = motore(), nome = nomeCane();
  const v = st.allenati;
  // il motore prepara la scheda quando "la pagina" è aperta
  useEffect(() => { if (attiva) { try { if (v === "obiettivi") M.showGoals(); else M.showTrain(); } catch (e) { console.warn(e); } } }, [attiva, v]);
  const chat = () => {
    try { M.openAI(); } catch {}
    const ob = v === "obiettivi";
    strati.foglio({ titolo: "Chiedi a Gohan", sotto: ob ? `L'allenatore: come allenare bene ${nome}` : `L'educatore: come insegnare un comando a ${nome}`, pieno: true, corpo: () => <ChatMini host={ob ? "ob-chat" : "tr-chat"} />, alChiudere: () => { try { M.closeAI(); } catch {} } });
  };
  return (
    <View style={{ flex: 1 }}>
      <PaginaGrande colore={TESTATA.allenati} titolo="Allenati" frase={v === "obiettivi" ? "Pochi minuti al giorno e divento un campione." : "Una lezione al giorno, con tanti premi."} posa="allenati" attiva={attiva} fondo={84}>
        <Segmenti voci={[["obiettivi", "Obiettivi"], ["addestramento", "Addestramento"]]} valore={v} onCambia={(k) => nav.allenati(k as any)} style={{ marginHorizontal: MARGINE, marginTop: 14 }} />
        <View style={{ paddingHorizontal: MARGINE, marginTop: 4 }}>
          <PaginaMotore id={v === "obiettivi" ? "ob-main" : "tr-main"} />
          <Testo tipo="piccolo" style={{ marginTop: 16 }}>{v === "obiettivi" ? "Consiglio prudente, non una garanzia: fermati ai primi segni di stanchezza. Non sostituisce il veterinario." : "Solo metodi gentili, con premi e mai punizioni. Per paure forti o aggressività chiedi a un educatore cinofilo."}</Testo>
        </View>
      </PaginaGrande>
      <ChiediAGohan attivo={attiva} onPress={chat} />
    </View>
  );
}
