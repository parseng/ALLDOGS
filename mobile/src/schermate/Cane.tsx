// Profilo del cane (la voce col suo nome nel menu): foto grande, limiti, salute in breve, ultimi 7 giorni,
// medaglie e "Aiuto e strumenti". Qui c'è il cane dell'utente: niente mascotte animata.
// Più sotto le pagine semplici che si aprono da qui: Salute, Zaino, Pronto soccorso, Regole, dati, account, proposte, impostazioni.
import React, { useEffect } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Text as SvgText } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BARRA_H, C, F, MARGINE, R, TESTATA } from "../theme";
import { motore, notifica, pagina, pulito, riavviaMotore, useMotore } from "../motore";
import { scrivi } from "../archivio";
import { nav } from "../nav";
import { scegliFoto } from "../foto";
import { SceltaAvatar } from "../ui/FotoAvatar";
import { BarraPeso } from "../ui/BarraPeso";
import { Bottone, Chip, Etichetta, Icona, RigaMenu, Sezione, Testo, Tocco } from "../ui/base";
import { FotoCane, fotoCane, nomeCane } from "../ui/BarraMenu";
import { PaginaMotore } from "../ui/PaginaMotore";
import { PaginaGrande, PaginaSemplice } from "../ui/Testate";
import { strati } from "../ui/strati";

const GIORNO = 864e5;
const oggiISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const dataIt = (s: string) => new Date(s + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "long" });

// ---------- medaglie, calcolate dalle uscite salvate ----------
type Medaglia = { nome: string; colore: string; nastro: string; dentro: string; presa?: string; manca?: string };
export function medaglie(): Medaglia[] {
  const M = motore(), A = ((M && M.S.acts) || []) as any[], cur = M.DOGS.cur;
  const mie = A.filter((x) => !x.dogs || x.dogs.includes(cur)).slice().sort((a, b) => a.t - b.t);
  const quando = (x?: any) => (x ? new Date(x.t).toLocaleDateString("it-IT", { day: "numeric", month: "long" }) : undefined);
  const nEsima = (n: number) => mie[n - 1];
  let su = 0, mille: any = null, km = 0, cento: any = null;
  for (const x of mie) { su += x.up || 0; km += (x.dist || 0) / 1000; if (!mille && su >= 1000) mille = x; if (!cento && km >= 100) cento = x; }
  const lungo = mie.find((x) => (x.dist || 0) >= 8000), anello = mie.find((x) => x.kind === "giro" || (x.kind === "trail" && x.id && M.TR.get(x.id) && M.TR.get(x.id).shape === "loop"));
  const sentiero = mie.find((x) => x.kind === "trail"), maxKm = Math.max(0, ...mie.map((x) => (x.dist || 0) / 1000));
  return [
    { nome: "Prima uscita", colore: C.pink, nastro: "#DD8E80", dentro: "paw", presa: quando(nEsima(1)), manca: "fai la prima uscita" },
    { nome: "Primo sentiero", colore: C.lime, nastro: "#9DB536", dentro: "cai", presa: quando(sentiero), manca: "un sentiero della mappa" },
    { nome: "Dieci uscite", colore: C.yellow, nastro: "#D7A526", dentro: "10", presa: quando(nEsima(10)), manca: `mancano ${Math.max(0, 10 - mie.length)}` },
    { nome: "Primo anello", colore: C.water, nastro: "#6FA9C2", dentro: "loop", presa: quando(anello), manca: "un giro ad anello" },
    { nome: "8 km in un giro", colore: C.lime, nastro: "#9DB536", dentro: "route", presa: quando(lungo), manca: `mancano ${M.kmN(Math.max(0.1, 8 - maxKm).toFixed(1))} km` },
    { nome: "Mille metri di salita", colore: C.pink, nastro: "#DD8E80", dentro: "mount", presa: quando(mille), manca: `mancano ${Math.max(0, Math.round(1000 - su))} m` },
    { nome: "Trenta uscite", colore: C.yellow, nastro: "#D7A526", dentro: "30", presa: quando(nEsima(30)), manca: `mancano ${Math.max(0, 30 - mie.length)}` },
    { nome: "Cento km", colore: C.water, nastro: "#6FA9C2", dentro: "100", presa: quando(cento), manca: `mancano ${Math.max(1, Math.round(100 - km))} km` },
  ];
}
const PEZZI: Record<string, string> = {
  paw: "M23.5 28c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3zm4.5-4.3c-1.1 0-2-1-2-2.4s.9-2.4 2-2.4 2 1.1 2 2.4-.9 2.4-2 2.4zm8 0c-1.1 0-2-1-2-2.4s.9-2.4 2-2.4 2 1.1 2 2.4-.9 2.4-2 2.4zm4.5 4.3c-1.1 0-2-1-2-2.3s.9-2.3 2-2.3 2 1 2 2.3-.9 2.3-2 2.3zM32 28.6c-2.9 0-5.4 3-5.4 5.3 0 1.6 1.3 2.4 2.8 2.1.9-.2 1.6-.6 2.6-.6s1.7.4 2.6.6c1.5.3 2.8-.5 2.8-2.1 0-2.3-2.5-5.3-5.4-5.3z",
  loop: "M25 31a7 7 0 1 1 7 7M32 38l-3-3M32 38l-3 3",
  route: "M25 37a2 2 0 1 0 0.1 0M39 21a2 2 0 1 0 0.1 0M27 37h6a3 3 0 0 0 0-6h-3a3 3 0 0 1 0-6h7",
  mount: "M22 38l7-12 4 6 3-4 6 10z",
};
function DisegnoMedaglia({ m, i }: { m: Medaglia; i: number }) {
  const spento = !m.presa, K = C.ink, cx = 32, cy = 29, r = 21.5, R2 = 25.5, N = 14, f = (x: number) => Math.round(x * 10) / 10;
  let d = "";
  for (let k = 0; k < N; k++) {
    const a = (t: number) => (t / N) * 2 * Math.PI - Math.PI / 2, a0 = a(k), am = a(k + 0.5), a1 = a(k + 1);
    if (!k) d += `M${f(cx + r * Math.cos(a0))} ${f(cy + r * Math.sin(a0))}`;
    d += `Q${f(cx + R2 * 1.1 * Math.cos(am))} ${f(cy + R2 * 1.1 * Math.sin(am))} ${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}`;
  }
  const col = spento ? "#7A8473" : K, bordo = spento ? "#9AA392" : K;
  return (
    <Svg width={64} height={72} viewBox="0 0 64 72">
      <Path d="M22 42l-6 24 7.5-3.8 4.2 6.3 5.3-21.5zM42 42l6 24-7.5-3.8-4.2 6.3-5.3-21.5z" fill={spento ? "#CBD2BF" : m.nastro} stroke={bordo} strokeWidth={1.6} strokeLinejoin="round" />
      <Path d={d + "z"} fill={spento ? C.sage2 : m.colore} stroke={bordo} strokeWidth={1.8} strokeLinejoin="round" />
      <Circle cx={cx} cy={cy} r={15.5} fill={spento ? "#F3F5EE" : C.cream} stroke={bordo} strokeWidth={1.6} />
      {/^\d+$/.test(m.dentro) ? <SvgText x={32} y={35.5} textAnchor="middle" fontFamily={F.titolo} fontSize={m.dentro.length > 2 ? 13 : 17} fill={col}>{m.dentro}</SvgText>
        : m.dentro === "cai" ? <G stroke={col} strokeWidth={1.6}><Path d="M25 39V20" strokeLinecap="round" /><Rect x={25} y={20} width={15} height={11} rx={1.5} fill="#fff" /><Rect x={25} y={20} width={15} height={3.7} fill={spento ? "#CBD2BF" : C.coral} /><Rect x={25} y={27.3} width={15} height={3.7} fill={spento ? "#CBD2BF" : C.coral} /></G>
        : <Path d={PEZZI[m.dentro]} fill={m.dentro === "paw" || m.dentro === "mount" ? col : "none"} stroke={col} strokeWidth={m.dentro === "paw" ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" />}
      {spento ? <G><Circle cx={49} cy={46} r={8} fill={C.ink2} /><Rect x={45.5} y={45} width={7} height={5.5} rx={1.2} fill={C.cream} /><Path d="M47 45v-1.5a2 2 0 0 1 4 0V45" stroke={C.cream} strokeWidth={1.4} fill="none" /></G>
        : <G><Defs><ClipPath id={"mc" + i}><Circle cx={cx} cy={cy} r={23} /></ClipPath></Defs><G clipPath={`url(#mc${i})`}><Path d="M30 0h8L24 64h-8z" fill="#fff" opacity={0.5} /></G><Path d="M53 6l1.6 3.9L58.5 11.5 54.6 13.1 53 17 51.4 13.1 47.5 11.5 51.4 9.9z" fill="#fff" stroke={K} strokeWidth={1.2} strokeLinejoin="round" /></G>}
    </Svg>
  );
}
export function MedagliaGrande({ m }: { m: Medaglia }) {
  return <View style={{ transform: [{ scale: 1.5 }] }}><DisegnoMedaglia m={m} i={99} /></View>;
}

// ---------- profilo ----------
export function Cane({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore(), ins = useSafeAreaInsets(), d = M.dog(), nome = nomeCane(), cap = M.capacity(d), h = d.health || {};
  useEffect(() => { if (attiva) { try { M.showDog(); } catch {} } }, [attiva]);
  const ph = fotoCane();
  const cambiaFoto = async () => { const f = await scegliFoto({ quadrata: true, lato: 640, base64: true }); if (f && f.dati) { M.store.set(M.PHK, f.dati); strati.avviso("Foto salvata"); } };
  // ultimi 7 giorni
  const A = (M.S.acts as any[]).filter((x) => !x.dogs || x.dogs.includes(M.DOGS.cur));
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  const giorni = Array.from({ length: 7 }, (_, i) => { const t0 = oggi.getTime() - (6 - i) * GIORNO; const L = A.filter((x) => x.t >= t0 && x.t < t0 + GIORNO); return { t0, km: L.reduce((s, x) => s + x.dist / 1000, 0), ms: L.reduce((s, x) => s + x.dur, 0), n: L.length }; });
  const mx = Math.max(0.1, ...giorni.map((g) => g.km)), sett = giorni.reduce((s, g) => ({ km: s.km + g.km, ms: s.ms + g.ms, n: s.n + g.n }), { km: 0, ms: 0, n: 0 });
  const med = medaglie(), prese = med.filter((m) => m.presa).length;
  // salute in breve
  const oggiS = oggiISO();
  const ap = h.antipdate as string | undefined, vax = ((h.vax || []) as any[]).filter((v) => v.d).sort((a, b) => (a.d < b.d ? -1 : 1));
  const stato = (data?: string): ["presto" | "fatto" | "dafare", string] => { if (!data) return ["dafare", "Da segnare"]; if (data < oggiS) return ["dafare", "Scaduto"]; const gg = Math.round((Date.parse(data) - oggi.getTime()) / GIORNO); return gg <= 14 ? ["presto", gg <= 0 ? "Oggi" : gg === 1 ? "Domani" : `Tra ${gg} giorni`] : ["fatto", "A posto"]; };
  const manca = [!d.breed && "razza", !h.chip && "microchip", !h.vet && "veterinario", !vax.length && "vaccini"].filter(Boolean) as string[];
  const tel = h.vettel ? String(h.vettel).replace(/[^+0-9]/g, "") : "";
  const ALTRI = M.DOGS.list as any[];
  const scegliCane = (id: string) => { if (id === M.DOGS.cur) return; M.DOGS.cur = id; if (!M.DOGS.walk.includes(id)) M.DOGS.walk = [id]; M.dogsSave(); scrivi("alldogs-dog", ALTRI.find((x) => x.id === id)); riavviaMotore(); };
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.sage }} contentContainerStyle={{ paddingBottom: BARRA_H + ins.bottom + 28 }} showsVerticalScrollIndicator={false}>
      <View style={{ height: 300 + ins.top, backgroundColor: C.forest }}>
        {ph ? <Image source={{ uri: ph }} style={{ width: "100%", height: "100%" }} contentFit="cover" contentPosition="top" accessibilityLabel={`La foto di ${nome}`} />
          : <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: ins.top }}><Text style={{ fontFamily: F.titolo, fontSize: 96, color: C.lime }}>{nome.charAt(0).toUpperCase()}</Text></View>}
        <Tocco onPress={cambiaFoto} style={{ position: "absolute", right: 12, bottom: 12, height: 40, paddingHorizontal: 14, borderRadius: 8, backgroundColor: C.ink, flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Icona nome="edit" size={16} colore={C.cream} /><Text style={{ fontFamily: F.t700, fontSize: 14, color: C.cream }}>{ph ? "Cambia foto" : "Aggiungi una foto"}</Text>
        </Tocco>
      </View>
      <View style={{ paddingHorizontal: MARGINE, paddingTop: 16 }}>
        {ALTRI.length >= 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 12 }}>
            {ALTRI.map((x) => <Tocco key={x.id} onPress={() => scegliCane(x.id)} accessibilityState={{ selected: x.id === M.DOGS.cur }} style={{ alignItems: "center", gap: 4 }}><View style={{ borderRadius: 30, borderWidth: 2.5, borderColor: x.id === M.DOGS.cur ? C.ink : "transparent", padding: 2 }}><FotoCane size={50} id={x.id} /></View><Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.ink }}>{x.name || "?"}</Text></Tocco>)}
            <Tocco onPress={() => nav.apri("nuovocane")} style={{ alignItems: "center", gap: 4 }}><View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}><Icona nome="plus" size={22} /></View><Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.ink }}>Aggiungi</Text></Tocco>
          </ScrollView>
        ) : null}
        <Text accessibilityRole="header" style={{ fontFamily: F.titolo, fontSize: 40, letterSpacing: -1.4, lineHeight: 42, color: C.ink }}>{nome}</Text>
        <Text style={{ fontFamily: F.t700, fontSize: 16, color: C.ink2, marginTop: 6 }}>{[d.sex === "m" ? "maschio" : d.sex === "f" ? "femmina" : "", d.breed, d.age !== "" && d.age != null ? `${String(d.age).replace(".", ",")} anni` : "", d.weight ? `${String(d.weight).replace(".", ",")} kg` : ""].filter(Boolean).join(" · ")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}><Icona nome="paw" size={18} colore={C.copper} /><Text style={{ fontFamily: F.t700, fontSize: 15, color: C.ink }}>Regge circa {M.kmN(cap.km)} km e {cap.up} m di salita</Text></View>
        {cap.notes.length ? <Testo tipo="piccolo" style={{ marginTop: 4 }}>Limiti più prudenti perché {nome} {cap.notes.join(", ")}.</Testo> : null}
      </View>

      <View style={{ marginTop: 26, paddingHorizontal: MARGINE, paddingTop: 20, paddingBottom: 14, backgroundColor: C.waterSoft, borderTopWidth: 3, borderTopColor: C.water }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.lime, alignItems: "center", justifyContent: "center" }}><Icona nome="h-salute" size={30} /></View>
          <View><Text style={{ fontFamily: F.titolo, fontSize: 24, letterSpacing: -0.5, color: C.ink }}>Salute</Text><Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>Promemoria e libretto di {nome}</Text></View>
        </View>
        <Tocco hitSlop={0} onPress={() => nav.apri("salute")} style={{ marginTop: 14, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.waterLine, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: F.t700, fontSize: 15.5, color: C.ink }}>Peso</Text>
          <Text style={{ fontFamily: F.titolo, fontSize: 34, letterSpacing: -1, color: C.ink, fontVariant: ["tabular-nums"] }}>{d.weight ? String(d.weight).replace(".", ",") : "–"}<Text style={{ fontSize: 18 }}> kg</Text></Text>
        </Tocco>
        {[["Antiparassitario", ap ? `Prossima dose: ${dataIt(ap)}` : "Segna la prossima dose nel libretto", stato(ap)], ["Richiamo vaccino", vax.length ? `${vax[0].n || "Vaccino"}: ${dataIt(vax[0].d)}` : "Segna i vaccini nel libretto", stato(vax.length ? vax[0].d : undefined)]].map(([t, s, [k, l]]: any) => (
          <Tocco key={t} hitSlop={0} onPress={() => nav.apri("salute")} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.waterLine }}>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t700, fontSize: 15.5, color: C.ink }}>{t}</Text><Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>{s}</Text></View>
            <Etichetta stato={k} testo={l} />
          </Tocco>
        ))}
        {manca.length >= 2 ? (
          <Tocco hitSlop={0} onPress={() => nav.apri("dati")} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.waterLine }}>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t700, fontSize: 15.5, color: C.ink }}>Libretto da completare</Text><Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>Mancano {M.andNames(manca)}</Text></View>
            <Etichetta stato="dafare" testo="Da fare" />
          </Tocco>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 11 }}>
          <View style={{ flex: 1 }}><Text style={{ fontFamily: F.t700, fontSize: 15.5, color: C.ink }}>Il tuo veterinario</Text><Text style={{ fontFamily: F.t600, fontSize: 13.5, color: C.ink2 }}>{h.vet || "Aggiungilo nel libretto"}</Text></View>
          {tel ? <Tocco onPress={() => Linking.openURL("tel:" + tel)} accessibilityLabel={`Chiama il veterinario di ${nome}`} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.forest, alignItems: "center", justifyContent: "center" }}><Icona nome="phone" size={20} colore={C.lime} /></Tocco> : null}
        </View>
        <Tocco hitSlop={0} onPress={() => nav.apri("salute")} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }}><Text style={{ fontFamily: F.t800, fontSize: 15, color: C.ink }}>Vedi tutto: peso, costole, promemoria</Text><Icona nome="chev" size={16} /></Tocco>
      </View>

      <View style={{ paddingHorizontal: MARGINE }}>
        <Sezione titolo="Ultimi 7 giorni" destra={sett.n ? `${sett.n} ${sett.n === 1 ? "uscita" : "uscite"}` : "nessuna uscita"} />
        <View style={{ flexDirection: "row", gap: 6, height: 84, alignItems: "flex-end" }} accessibilityLabel="Km camminati negli ultimi 7 giorni">
          {giorni.map((g, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4, height: "100%" }}>
              {g.km ? <Text style={{ fontFamily: F.t700, fontSize: 11, color: C.ink }}>{M.kmN(g.km.toFixed(1))}</Text> : null}
              <View style={{ width: "100%", maxWidth: 26, borderTopLeftRadius: 3, borderTopRightRadius: 3, height: g.km ? Math.max(4, Math.round((g.km / mx) * 52)) : 3, backgroundColor: !g.km ? C.sage2 : i === 6 ? C.copper : C.forest }} />
              <Text style={{ fontFamily: F.t800, fontSize: 12, color: i === 6 ? C.ink : C.ink2 }}>{i === 6 ? "Oggi" : new Date(g.t0).toLocaleDateString("it-IT", { weekday: "short" }).slice(0, 2).replace(/^./, (c) => c.toUpperCase())}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: "row", marginTop: 12, borderTopWidth: 1, borderColor: C.sage2 }}>
          {[[`${M.kmN(sett.km.toFixed(1))} km`, "camminati"], [M.fmtDur(Math.max(60000, sett.ms)), "all'aperto"], [Math.round((sett.km * 1000) / M.dogStep(d.weight)).toLocaleString("it-IT"), `passi di ${nome}`]].map(([a, b], i) => (
            <View key={i} style={{ flex: 1, paddingTop: 10, paddingLeft: i ? 12 : 0, borderLeftWidth: i ? 1 : 0, borderColor: C.sage2 }}><Text style={{ fontFamily: F.titolo, fontSize: 22, color: C.ink, fontVariant: ["tabular-nums"] }}>{sett.n || i ? a : "0 km"}</Text><Text style={{ fontFamily: F.t700, fontSize: 12.5, color: C.ink2 }}>{b}</Text></View>
          ))}
        </View>

        <Sezione titolo="Medaglie" destra={`${prese} di ${med.length}`} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14 }}>
          {med.map((m, i) => (
            <View key={m.nome} style={{ width: "25%", alignItems: "center", paddingHorizontal: 3 }}>
              <DisegnoMedaglia m={m} i={i} />
              <Text style={{ fontFamily: F.t700, fontSize: 12.5, lineHeight: 15, textAlign: "center", color: m.presa ? C.ink : C.ink2, marginTop: 4 }}>{m.nome}</Text>
              <Text style={{ fontFamily: F.t700, fontSize: 11.5, textAlign: "center", color: C.ink2, marginTop: 2 }}>{m.presa || m.manca}</Text>
            </View>
          ))}
        </View>

        <Sezione titolo="Aiuto e strumenti" />
        <RigaMenu disegno="h-sos" sfondo={C.coral} titolo="Emergenza" sotto="Chiama il veterinario e manda dove sei" onPress={() => M.sosSheet(null)} />
        <RigaMenu disegno="h-ps" sfondo={C.mint} titolo="Pronto soccorso" sotto="Cosa fare subito, in attesa del veterinario" onPress={() => nav.apri("soccorso")} />
        <RigaMenu disegno="h-zaino" sfondo={C.yellow} titolo="Zaino pronto" sotto="Cosa portare, con il meteo di oggi" onPress={() => nav.apri("zaino")} />
        <RigaMenu disegno="h-regole" sfondo={C.forest} titolo="Regole del posto" sotto="Guinzaglio, spiagge, parchi, pascoli" onPress={() => nav.apri("regole")} />
        <RigaMenu disegno="h-dati" sfondo={C.lime} titolo={`I dati di ${nome}`} sotto="Età, peso, allenamento, salute, libretto" onPress={() => nav.apri("dati")} />
        <RigaMenu disegno="h-dati" sfondo={C.sage2} titolo="Rifai le domande iniziali" sotto="Abitudini, orari liberi e obiettivo" onPress={() => nav.apri("domande")} />
        <RigaMenu disegno="h-prop" sfondo={C.water} titolo="Proponi un luogo o un sentiero" sotto="Area cani, spiaggia, fontanella o un tuo giro" onPress={() => nav.apri("proponi")} />
        <RigaMenu disegno="h-acc" sfondo={C.lilac} titolo="Il tuo account" sotto="Salva i dati anche nel tuo account" onPress={() => nav.apri("account")} />
        <RigaMenu disegno="h-imp" sfondo={C.pink} titolo="Impostazioni" sotto="Promemoria, privacy, fonti dei dati" onPress={() => nav.apri("impostazioni")} ultima />
        {ALTRI.length < 2 ? <Bottone testo="Aggiungi un altro cane" icona="plus" tinta="chiaro" largo style={{ marginTop: 16 }} onPress={() => nav.apri("nuovocane")} /> : null}
        <Testo tipo="piccolo" style={{ marginTop: 14 }}>I consigli dell'app non sostituiscono il veterinario.</Testo>
      </View>
    </ScrollView>
  );
}

// ---------- pagine semplici aperte dal profilo ----------
const indietro = () => nav.indietro();
export function Salute({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore();
  useEffect(() => { if (attiva) { try { M.showHealth(); M.renderRem(); } catch (e) { console.warn(e); } } }, [attiva]);
  return (
    <View style={{ flex: 1 }}>
      <PaginaGrande colore={TESTATA.salute} titolo="Salute" frase="Il veterinario resta il mio migliore amico, ma i promemoria li tengo io." posa="salute" attiva={attiva}>
        <View style={{ paddingHorizontal: MARGINE }}>
          <Tocco onPress={indietro} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, marginTop: 6 }}><Icona nome="back" size={18} /><Text style={{ fontFamily: F.t800, fontSize: 15, color: C.ink }}>Torna al profilo</Text></Tocco>
          <BarraPeso />
          <PaginaMotore id="he-rem" />
          <PaginaMotore id="he-main" />
          <Testo tipo="piccolo" style={{ marginTop: 16 }}>Indicazioni prudenti, non una visita: peso, dieta e attività le decide il veterinario.</Testo>
        </View>
      </PaginaGrande>
    </View>
  );
}
function Semplice({ attiva, colore, titolo, riga, prepara, id, sel, nota, togli, prima }: { prima?: React.ReactNode; attiva: boolean; colore: string; titolo: string; riga?: string; prepara?: () => void; id?: string; sel?: string; nota?: string; togli?: string[] }) {
  useMotore();
  useEffect(() => { if (attiva && prepara) { try { prepara(); } catch (e) { console.warn(e); } } }, [attiva]);
  return (
    <PaginaSemplice colore={colore} titolo={titolo} riga={riga} indietro={indietro}>
      {prima}
      <PaginaMotore id={id} sel={sel} togli={togli} />
      {nota ? <Testo tipo="piccolo" style={{ marginTop: 16 }}>{nota}</Testo> : null}
    </PaginaSemplice>
  );
}
export const Zaino = ({ attiva }: { attiva: boolean }) => <Semplice attiva={attiva} colore={TESTATA.zaino} titolo="Zaino pronto" riga="Cosa portare, con il meteo di oggi." prepara={() => motore().showPack()} id="zn-main" />;
export const Soccorso = ({ attiva }: { attiva: boolean }) => <Semplice attiva={attiva} colore={TESTATA.soccorso} titolo="Pronto soccorso" riga="Cosa fare subito, in attesa del veterinario." prepara={() => motore().showAid()} id="ps-main" nota="Primi aiuti in attesa del veterinario, non una cura. Nel dubbio chiamalo subito." />;
export const Regole = ({ attiva }: { attiva: boolean }) => <Semplice attiva={attiva} colore={TESTATA.regole} titolo="Regole del posto" riga="Guinzaglio, spiagge, parchi, pascoli." prepara={() => motore().showRules()} id="rg-main" />;
export const Dati = ({ attiva }: { attiva: boolean }) => <Semplice attiva={attiva} colore={C.lime} titolo={`I dati di ${nomeCane()}`} riga="Età, peso, allenamento, salute e libretto." prepara={() => { const M = motore(); M.showDog(); pagina().el("fold-dog").open = true; }} sel="#fold-dog > .foldb" togli={[".onbonly"]} prima={<SceltaSesso />} nota="Restano su questo telefono e, se accedi, anche nel tuo account privato." />;
/** sesso del cane (serve per il peso giusto): si cambia qui */
export function SceltaSesso() {
  useMotore();
  const M = motore(), d = M.dog();
  const metti = (v: string) => { M.S.dog = { ...M.dog(), sex: v }; M.store.set("alldogs-dog", M.S.dog); notifica(); };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <Text style={{ fontFamily: F.t800, fontSize: 15, color: C.ink, marginRight: 4 }}>Sesso</Text>
      {([["m", "Maschio"], ["f", "Femmina"]] as const).map(([v, t]) => <Chip key={v} piccolo testo={t} attivo={d.sex === v} onPress={() => metti(v)} />)}
    </View>
  );
}
export const Proponi = ({ attiva }: { attiva: boolean }) => <Semplice attiva={attiva} colore={C.water} titolo="Proponi un posto" riga="Area cani, spiaggia, fontanella o un tuo giro: lo controllo e lo aggiungo per tutti." prepara={() => { try { motore().propList && motore().propList(); } catch {} }} sel="#fold-prop > .foldb" />;
export const Account = ({ attiva }: { attiva: boolean }) => <Semplice attiva={attiva} colore={C.lilac} titolo="Il tuo account" riga="Per non perdere i dati se cambi telefono." prepara={() => { const M = motore(); M.accPaint(); M.sbLoad().catch(() => {}); }} id="acc-box" />;
/** riquadro delle impostazioni: disegnino, titolo, spiegazione e quello che serve */
function Scheda({ disegno, titolo, testo, children }: { disegno: string; titolo: string; testo?: string; children?: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.cream, borderRadius: 22, padding: 16, marginTop: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: C.sage, alignItems: "center", justifyContent: "center" }}><Icona nome={disegno} size={38} /></View>
        <Text style={{ flex: 1, fontFamily: F.titolo, fontSize: 19, letterSpacing: -0.3, color: C.ink }}>{titolo}</Text>
      </View>
      {testo ? <Text style={{ fontFamily: F.t600, fontSize: 14.5, lineHeight: 20, color: C.ink2, marginTop: 10 }}>{testo}</Text> : null}
      {children ? <View style={{ marginTop: 6 }}>{children}</View> : null}
    </View>
  );
}
function RigaLink({ disegno, testo, onPress }: { disegno: string; testo: string; onPress: () => void }) {
  return (
    <Tocco hitSlop={0} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: 1, borderTopColor: C.sage2, marginTop: 6 }}>
      <Icona nome={disegno} size={26} /><Text style={{ flex: 1, fontFamily: F.t700, fontSize: 15.5, color: C.ink }}>{testo}</Text><Icona nome="chev" size={16} colore={C.ink2} />
    </Tocco>
  );
}
export function Impostazioni({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore();
  const SITO = "https://parseng.github.io/ALLDOGS/";
  return (
    <PaginaSemplice colore={TESTATA.impostazioni} titolo="Impostazioni" riga={`Per ${nomeCane()} e per te.`} indietro={indietro}>
      <Scheda disegno="d-foto" titolo={`Foto di ${nomeCane()}`} testo="La sua foto diventa il suo avatar in tutta l'app.">
        <SceltaAvatar />
      </Scheda>
      <Scheda disegno="d-cani" titolo="I tuoi cani" testo="Hai più cani? Aggiungili: ognuno ha il suo profilo, la sua salute e i suoi limiti. Prima di una passeggiata scegli chi viene.">
        <Bottone testo="Aggiungi un altro cane" icona="plus" tinta="lime" piccolo style={{ marginTop: 10, alignSelf: "flex-start" }} onPress={() => nav.apri("nuovocane")} />
      </Scheda>
      <Scheda disegno="d-campanella" titolo="Promemoria" testo="Ti ricordo la passeggiata all'inizio delle fasce orarie libere che hai indicato nelle domande iniziali.">
        <Bottone testo="Cambia gli orari liberi" tinta="chiaro" piccolo style={{ marginTop: 10, alignSelf: "flex-start" }} onPress={() => nav.apri("domande")} />
      </Scheda>
      <Scheda disegno="d-bussola" titolo="Navigazione" testo="Indicazioni, voce e pausa automatica si cambiano durante una passeggiata, con l'ingranaggio." />
      <Scheda disegno="d-lucchetto" titolo="Privacy e condizioni" testo="Come trattiamo i tuoi dati e le regole dell'app.">
        <RigaLink disegno="d-lucchetto" testo="Informativa sulla privacy" onPress={() => Linking.openURL(SITO + "privacy.html")} />
        <RigaLink disegno="d-documento" testo="Condizioni d'uso" onPress={() => Linking.openURL(SITO + "termini.html")} />
      </Scheda>
      <Scheda disegno="d-avviso" titolo="Avvertenze e fonti">
        <PaginaMotore sel="#settings > .foldb" />
      </Scheda>
    </PaginaSemplice>
  );
}

/** Rifai le domande iniziali: sono quelle del sito (abitudini, orari liberi, durata, obiettivo) */
export function Domande({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore(), ins = useSafeAreaInsets();
  useEffect(() => { if (attiva) { try { M.wzOpen("redo"); } catch (e) { console.warn(e); } } return () => { try { M.wzClose(); } catch {} }; }, [attiva]);
  const el = (id: string) => pagina().el(id);
  const fine = M.W && M.WSTEPS && M.WSTEPS[M.W.i] && M.WSTEPS[M.W.i].end;
  const premi = (id: string) => { el(id).click(); };
  return (
    <View style={{ flex: 1, backgroundColor: C.sage, paddingTop: ins.top + 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18 }}>
        <Tocco onPress={() => (M.W.i > 0 ? premi("wz-back") : nav.indietro())} accessibilityLabel="Indietro" style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.cream, alignItems: "center", justifyContent: "center" }}><Icona nome="back" size={22} /></Tocco>
        <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: C.sage2, overflow: "hidden" }}><View style={{ height: "100%", width: `${Math.round(((M.W.i || 0) / Math.max(1, M.WSTEPS.length - 1)) * 100)}%`, backgroundColor: C.forest }} /></View>
        {!fine ? <Tocco onPress={() => premi("wz-skip")} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 6 }}><Text style={{ fontFamily: F.t800, fontSize: 15, color: C.ink2 }}>Salta</Text></Tocco> : null}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <PaginaMotore id="wz-body" />
        <Bottone testo={fine ? "Salva" : "Avanti"} largo style={{ marginTop: 18 }} onPress={() => premi("wz-next")} />
      </ScrollView>
    </View>
  );
}
