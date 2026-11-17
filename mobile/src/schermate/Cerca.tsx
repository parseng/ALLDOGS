// Ricerca a tutto schermo: sentieri di tutta Italia e luoghi. Quelli vietati ai cani sono segnati in rosso.
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { C, F, MARGINE } from "../theme";
import { motore, pagina, pulito, useMotore } from "../motore";
import { nav } from "../nav";
import { Chip, Icona, Tocco } from "../ui/base";
import { nomeCane } from "../ui/BarraMenu";
import { BarraAlta } from "../ui/Testate";
import { Foto, Vuoto, verdettoTesto } from "../ui/sentieri";
import { TIPO_PARCO, apriParco, cercaParchi } from "../parchi";
import { strati } from "../ui/strati";
import { filtro } from "./Esplora";

function Riga({ icona, img, titolo, sotto, rosso, onPress }: { icona: string; img?: string; titolo: string; sotto?: string; rosso?: string; onPress: () => void }) {
  return (
    <Tocco hitSlop={0} onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.sage2 }}>
      <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.cream, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {img ? <Foto uri={img} style={{ width: 44, height: 44 }} /> : <Icona nome={icona} size={22} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: F.t700, fontSize: 15.5, color: C.ink }}>{titolo}</Text>
        {sotto || rosso ? <Text numberOfLines={2} style={{ fontFamily: F.t600, fontSize: 13.5, lineHeight: 18, color: C.ink2 }}>{rosso ? <Text style={{ color: C.dangerInk, fontFamily: F.t800 }}>{rosso} · </Text> : null}{sotto}</Text> : null}
      </View>
    </Tocco>
  );
}

export function Cerca({ attiva }: { attiva: boolean }) {
  useMotore();
  const M = motore(), nome = nomeCane();
  const [q, setQ] = useState("");
  const [scheda, setScheda] = useState<"all" | "trail" | "place">("all");
  const t = useRef<any>(0), campo = useRef<any>(null);
  useEffect(() => { M.loadNames().catch(() => {}); const x = setTimeout(() => campo.current?.focus(), 250); return () => clearTimeout(x); }, []);
  const scrivi = (v: string) => {
    setQ(v);
    pagina().el("sq").value = v;
    clearTimeout(t.current);
    t.current = setTimeout(() => { try { M.geoSuggest(); } catch {} }, 350);
  };
  const chiudi = () => nav.indietro();
  const apriSentiero = (r: any) => {
    M.cellOf[r.id] = r.cell; M.store.set("alldogs-cellof", M.cellOf);
    M.addRecent({ k: "t", id: r.id, cell: r.cell, name: r.name || "Sentiero " + r.ref, sub: [r.zone, M.km(r.tot || r.len) + " km"].filter(Boolean).join(" · ") });
    nav.sostituisci("sentiero", r.id);
  };
  const vaiA = (c: number[], z: number, bb: any) => { chiudi(); setTimeout(() => { try { M.goPlace(c, z, bb); } catch {} }, 350); };
  const apriLuogo = (x: any) => {
    const c = [x.center[1], x.center[0]], tipo = x.place_type && x.place_type[0], z = tipo === "region" ? 8.8 : 12, bb = tipo !== "poi" ? x.bbox : null;
    M.addRecent({ k: "p", name: x.text || x.place_name, sub: x.place_name.replace(/, Italia$/, ""), c, z, bb });
    vaiA(c, z, bb);
  };
  const qt = q.trim();
  let corpo: React.ReactNode;
  if (qt.length < 2) {
    const R = (M.store.get(M.RECENT_K) || []) as any[];
    const veloce = (fn: () => void) => { chiudi(); setTimeout(fn, 300); };
    corpo = (
      <>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
          <Chip piccolo testo={`Adatti a ${nome} qui vicino`} onPress={() => veloce(() => filtro("f-fit", "0"))} />
          <Chip piccolo testo="Giri brevi, fino a 5 km" onPress={() => veloce(() => filtro("f-len", "0-5"))} />
          <Chip piccolo testo={`Facili per ${nome}`} onPress={() => veloce(() => filtro("f-eff", "0"))} />
          <Chip piccolo testo="Con fontanelle" onPress={() => veloce(() => { M.S.feat = ["fontanelle"]; M.renderList(); })} />
          <Chip piccolo testo="Nel bosco, all'ombra" onPress={() => veloce(() => { M.S.feat = ["bosco"]; M.renderList(); })} />
        </View>
        <Riga icona="nav" titolo="Posizione attuale" sotto="Mostra i sentieri intorno a te" onPress={async () => { try { const p = await M.getPos(); vaiA(p, 13, null); } catch { strati.avviso("Non riesco a leggere la posizione"); } }} />
        <Riga icona="plus" titolo={`Crea un giro per ${nome}`} sotto="Un percorso su misura, partendo da dove vuoi" onPress={() => nav.sezione("crea")} />
        {R.length ? <Text style={{ fontFamily: F.t800, fontSize: 14, color: C.ink2, marginTop: 20, marginBottom: 2 }}>Ricerche recenti</Text> : null}
        {R.map((x, i) => (
          <Riga key={i} icona={x.k === "t" ? "flag" : x.k === "p" ? "pin" : "clock"} img={x.k === "t" && M.PH[x.id] && M.PH[x.id][0] ? M.PH[x.id][0].u : undefined} titolo={x.name} sotto={x.sub}
            onPress={() => { if (x.k === "t") apriSentiero({ id: x.id, cell: x.cell, name: x.name, zone: "", len: 0 }); else if (x.k === "p") { M.addRecent(x); vaiA(x.c, x.z || 12, x.bb || null); } else scrivi(x.name); }} />
        ))}
      </>
    );
  } else {
    const nq = M.norm(qt), th = scheda === "place" ? [] : (M.trailHits(qt) as any[]);
    const parole = nq.split(" ").filter((w: string) => w.length >= 3);
    const tutti = (M.geoPlaces || []) as any[];
    let gp = scheda === "trail" ? [] : tutti.filter((x) => { const pn = " " + M.norm(x.place_name); return parole.every((w: string) => pn.includes(" " + w)); });
    if (!gp.length && !th.length && scheda !== "trail") gp = tutti;
    const righeT = th.map((x) => {
      const r = x.r, tr = M.TR.get(r.id);
      let v = "";
      if (tr) { const res = M.verdict(M.item(tr), M.dog(), M.S.day); if (res.v >= 0) v = `${verdettoTesto(res.v)}${res.short ? " (" + res.short + ")" : ""} · ${M.fmtH(res.hours)} · `; }
      const d = M.hav(M.S.view.c, r.p);
      const sotto = [r.zone, v + M.km(r.tot || r.len) + " km" + (r.tot && r.tot !== r.len ? " a/r" : ""), d < 100e3 ? Math.round(d / 1000) + " km da qui" : ""].filter(Boolean).join(" · ");
      return <Riga key={"t" + r.id} icona="flag" img={M.PH[r.id] && M.PH[r.id][0] && M.PH[r.id][0].u} titolo={r.name || "Sentiero " + r.ref} sotto={sotto} rosso={r.dg === "no" ? "Cani vietati" : undefined} onPress={() => apriSentiero(r)} />;
    });
    const righeP = gp.map((x, i) => <Riga key={"p" + i} icona={x.place_type && x.place_type[0] === "poi" ? "pin" : "compass"} titolo={x.text || x.place_name} sotto={pulito(x.place_name.replace(/, Italia$/, "")) === x.text ? "Posto in Italia" : x.place_name.replace(/, Italia$/, "")} onPress={() => apriLuogo(x)} />);
    const primaLuogo = gp.some((x) => M.norm(x.text) === nq) && !(th[0] && th[0].r.n === nq);
    const righeParchi = scheda === "place" ? [] : cercaParchi(qt).map((p) => <Riga key={"pk" + p.id} icona="compass" titolo={p.n} sotto={`${TIPO_PARCO[p.k]} · ${p.s.length} sentieri`} onPress={() => { chiudi(); setTimeout(() => apriParco(p), 300); }} />);
    const lista = righeParchi.length ? [...righeParchi, ...(scheda === "all" ? (primaLuogo ? [...righeP, ...righeT] : [...righeT.slice(0, 4), ...righeP, ...righeT.slice(4)]) : [...righeT, ...righeP])] : scheda === "all" ? (primaLuogo ? [...righeP, ...righeT] : [...righeT.slice(0, 4), ...righeP, ...righeT.slice(4)]) : [...righeT, ...righeP];
    corpo = (
      <>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
          {([["all", "Tutto"], ["trail", "Sentieri"], ["place", "Luoghi"]] as const).map(([k, l]) => <Chip key={k} piccolo testo={l} attivo={scheda === k} onPress={() => setScheda(k)} />)}
        </View>
        {lista.length ? lista : <Vuoto titolo={!M.NAMES && scheda !== "place" ? "Cerco tra i sentieri di tutta Italia…" : "Nessun risultato"} testo={M.NAMES ? "Prova a scrivere solo una parola, per esempio il paese." : undefined} />}
      </>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.sage }}>
      <BarraAlta indietro={chiudi}>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 50, borderRadius: 999, backgroundColor: C.cream, paddingLeft: 16, paddingRight: 6, borderWidth: 2.5, borderColor: C.ink }}>
          <Icona nome="search" size={20} />
          <TextInput ref={campo} value={q} onChangeText={scrivi} placeholder="Cerca sentieri e posti" placeholderTextColor={C.ink2} returnKeyType="search" autoCorrect={false} onSubmitEditing={() => { if (qt.length >= 2) M.addRecent({ k: "q", name: qt }); }} style={{ flex: 1, fontFamily: F.t700, fontSize: 16, color: C.ink, height: "100%" }} accessibilityLabel="Cerca sentieri e posti" />
          {q ? <Tocco onPress={() => scrivi("")} accessibilityLabel="Cancella" style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.sage2, alignItems: "center", justifyContent: "center" }}><Icona nome="x" size={16} /></Tocco> : null}
        </View>
      </BarraAlta>
      <ScrollView keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" contentContainerStyle={{ paddingHorizontal: MARGINE, paddingBottom: 40, paddingTop: 6 }}>{corpo}</ScrollView>
    </View>
  );
}
