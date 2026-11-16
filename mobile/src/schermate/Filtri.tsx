// Tutti i filtri a tutto schermo, e "Chi viene?" quando i cani sono più di uno
// (con più cani i sentieri si giudicano sul più delicato del gruppo).
import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { C, F, MARGINE } from "../theme";
import { motore, pagina, useMotore } from "../motore";
import { nav } from "../nav";
import { Bottone, Chip, Disegno, Icona, Tocco } from "../ui/base";
import { FotoCane, nomeCane } from "../ui/BarraMenu";
import { BarraAlta } from "../ui/Testate";
import { strati } from "../ui/strati";
import { filtro, valoreFiltro } from "./Esplora";

function Gruppo({ titolo, nota, children }: { titolo: string; nota?: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.titolo, fontSize: 19, letterSpacing: -0.3, color: C.ink }}>{titolo}</Text>
        {nota ? <Text style={{ fontFamily: F.t700, fontSize: 13, color: C.ink2 }}>{nota}</Text> : null}
      </View>
      {children}
    </View>
  );
}
function Scelta({ id, voci }: { id: string; voci: [string, string][] }) {
  const v = valoreFiltro(id);
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{voci.map(([k, t]) => <Chip key={k} piccolo testo={t} attivo={v === k} onPress={() => filtro(id, v === k && k !== "all" ? "all" : k)} />)}</View>;
}
function Tessera({ k, testo, attivo, onPress }: { k: string; testo: string; attivo: boolean; onPress: () => void }) {
  const M = motore();
  return (
    <Tocco hitSlop={0} onPress={onPress} accessibilityState={{ selected: attivo }} style={{ width: "31.5%", alignItems: "center", gap: 4, paddingTop: 10, paddingBottom: 9, paddingHorizontal: 4, borderRadius: 14, backgroundColor: attivo ? C.ink : C.cream, minHeight: 44 }}>
      {M.ART[k] ? <Disegno xml={M.ART[k]} size={40} /> : null}
      <Text style={{ fontFamily: F.t800, fontSize: 12.5, lineHeight: 14.5, textAlign: "center", color: attivo ? C.lime : C.ink }}>{testo}</Text>
    </Tocco>
  );
}

export function Filtri({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore(), ins = useSafeAreaInsets(), nome = nomeCane();
  const cani = M.DOGS.list as any[];
  const capo = (M.dog().lead || M.dog().name || nome) as string;
  const zone = useMemo(() => {
    const cnt: Record<string, number> = {};
    for (const t of M.S.trails) if (t.zone && M.inView(t)) cnt[t.zone] = (cnt[t.zone] || 0) + 1;
    return Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]).slice(0, 14);
  }, [M.S.trails]);
  const n = (M.S.rows || []).length;
  const chiViene = (id: string) => {
    const i = M.DOGS.walk.indexOf(id);
    if (i >= 0) { if (M.DOGS.walk.length === 1) { strati.avviso("Almeno un cane deve venire"); return; } M.DOGS.walk.splice(i, 1); } else M.DOGS.walk.push(id);
    M.dogsSave(); M.S.limit = 20; M.renderList();
  };
  const azzera = () => { M.S.day = 0; pagina().el("reset").click(); };
  const giorni: [string, string][] = [0, 1, 2, 3, 4, 5, 6].map((i) => [String(i), M.dayName(i)]);
  return (
    <View style={{ flex: 1, backgroundColor: C.sage }}>
      <BarraAlta titolo="Filtri" icona="x" indietro={() => nav.indietro()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: MARGINE, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {cani.length > 1 ? (
          <Gruppo titolo="Chi viene?" nota="anche più cani">
            {cani.map((x) => {
              const on = M.DOGS.walk.includes(x.id);
              return (
                <Tocco key={x.id} hitSlop={0} onPress={() => chiViene(x.id)} accessibilityState={{ selected: on }} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 8 }}>
                  <View style={{ borderRadius: 28, borderWidth: 2, borderColor: on ? C.ink : "transparent", padding: 2 }}><FotoCane size={46} id={x.id} /></View>
                  <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t700, fontSize: 16, color: C.ink }}>{x.name || "?"}</Text><Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>{[x.breed, x.age != null && x.age !== "" ? `${String(x.age).replace(".", ",")} anni` : "", x.weight ? `${x.weight} kg` : ""].filter(Boolean).join(" · ")}</Text></View>
                  <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: on ? C.lime : C.sage2, alignItems: "center", justifyContent: "center" }}>{on ? <Icona nome="check" size={16} /> : null}</View>
                </Tocco>
              );
            })}
            {M.DOGS.walk.length > 1 ? <Text style={{ fontFamily: F.t700, fontSize: 13.5, color: C.ink, backgroundColor: "#FFF1BF", paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, marginTop: 4, overflow: "hidden" }}>Sentieri giudicati su {capo}, il più delicato del gruppo.</Text> : null}
          </Gruppo>
        ) : null}
        <Gruppo titolo="Quando"><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{giorni.map(([k, t]) => <Chip key={k} piccolo testo={t} attivo={String(M.S.day) === k} onPress={() => { M.S.day = +k; pagina().el("f-day").value = k; M.renderList(); }} />)}</View></Gruppo>
        <Gruppo titolo="Cani ammessi"><Scelta id="f-dog" voci={[["all", "Solo dove sono ammessi"], ["free", "Senza limiti per i cani"], ["show", "Anche dove sono vietati"]]} /></Gruppo>
        <Gruppo titolo={`Per ${capo}`}><Scelta id="f-fit" voci={[["all", "Tutti"], ["0", `Adatti a ${capo}`], ["01", "Adatti o con prudenza"]]} /></Gruppo>
        <Gruppo titolo={`Impegno per ${capo}`}><Scelta id="f-eff" voci={[["all", "Qualsiasi"], ["0", "Facile per lui"], ["1", "Media per lui"], ["2", "Difficile per lui"]]} /></Gruppo>
        <Gruppo titolo="Tipo di percorso"><Scelta id="f-type" voci={[["all", "Tutti"], ["loop", "Ad anello"], ["lolli", "Anello con un tratto da rifare"], ["line", "Andata e ritorno"], ["walk", "Giri in città"], ["cai", "Sentieri con un numero"], ["flat", "Pianeggianti"]]} /></Gruppo>
        <Gruppo titolo="Lunghezza" nota="andata e ritorno"><Scelta id="f-len" voci={[["all", "Qualsiasi"], ["0-5", "Fino a 5 km"], ["5-10", "5-10 km"], ["10-99", "Più di 10 km"]]} /></Gruppo>
        <Gruppo titolo="Dislivello"><Scelta id="f-up" voci={[["all", "Qualsiasi"], ["0-150", "Fino a 150 m"], ["150-400", "150-400 m"], ["400-800", "400-800 m"], ["800-99999", "Oltre 800 m"]]} /></Gruppo>
        <Gruppo titolo="Attività">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{M.ACTS.map(([k, t]: string[]) => <Tessera key={k} k={k} testo={t} attivo={M.S.act === k} onPress={() => { M.S.act = M.S.act === k ? null : k; M.S.limit = 20; M.fitPending = true; M.renderList(); }} />)}</View>
        </Gruppo>
        <Gruppo titolo="Particolarità" nota="con tutte quelle scelte">
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{M.FEATS.map(([k, t]: string[]) => <Tessera key={k} k={k} testo={t} attivo={M.S.feat.includes(k)} onPress={() => { const i = M.S.feat.indexOf(k); if (i >= 0) M.S.feat.splice(i, 1); else M.S.feat.push(k); M.S.limit = 20; M.fitPending = true; M.renderList(); }} />)}</View>
        </Gruppo>
        <Gruppo titolo="Difficoltà CAI" nota="per le persone"><Scelta id="f-dif" voci={[["all", "Qualsiasi"], ["T", "T, turistico"], ["E", "E, escursionistico"], ["EE", "EE, per esperti"]]} /></Gruppo>
        {zone.length ? <Gruppo titolo="Zona"><Scelta id="f-zone" voci={[["all", "Tutte le zone"], ...zone.map((z) => [z, z] as [string, string])]} /></Gruppo> : null}
      </ScrollView>
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", gap: 8, paddingHorizontal: MARGINE, paddingTop: 14, paddingBottom: ins.bottom + 16, backgroundColor: "rgba(238,241,230,0.96)" }}>
        <Bottone testo="Azzera" tinta="chiaro" style={{ flex: 1, alignSelf: "auto" }} onPress={azzera} />
        <Bottone testo={M.S.far ? "Vedi sulla mappa" : `Vedi ${n} ${n === 1 ? "sentiero" : "sentieri"}`} tinta="lime" style={{ flex: 1.6, alignSelf: "auto" }} onPress={() => nav.indietro()} />
      </View>
    </View>
  );
}
